import json
import anthropic
from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from geopy.distance import geodesic

from api.deps import DB
from api.schemas import RecommendRequest, RecommendResponse, ProductOut, DispensaryOut
from core.config import settings
from models.product import Product
from models.dispensary import Dispensary

router = APIRouter(prefix="/recommend", tags=["recommend"])

_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """You are an expert cannabis sommelier for New Jersey dispensaries.
You have deep knowledge of strains, terpenes, effects, and how they interact.
You will be given a user's intent and a JSON list of available products near them with real-time pricing.

Your job: recommend 3-5 specific products that best match what they're looking for.
Be specific and conversational — mention the strain, the deal (if any), the price, and why it fits.
Format: a short paragraph response followed by the product IDs you're recommending as JSON.

Example closing line:
{"recommended_ids": [123, 456, 789]}

Always include that JSON block at the very end of your response."""


@router.post("", response_model=RecommendResponse)
async def recommend(req: RecommendRequest, db: DB):
    # Pull candidate products near the user
    stmt = (
        select(Product)
        .join(Product.dispensary)
        .options(selectinload(Product.dispensary))
        .where(Product.in_stock == True)
        .where(Dispensary.is_active == True)
        .where(Product.category == "flower")  # default to flower; expand later
    )
    if req.preferred_types:
        stmt = stmt.where(Product.product_type.in_(req.preferred_types))

    rows = await db.execute(stmt)
    all_products = rows.scalars().all()

    # Filter by radius and budget, attach distance
    candidates = []
    for p in all_products:
        dist = None
        if req.lat and req.lng and p.dispensary.lat and p.dispensary.lng:
            dist = geodesic((req.lat, req.lng), (p.dispensary.lat, p.dispensary.lng)).miles
            if dist > req.radius_miles:
                continue

        if req.budget and p.pricing:
            cheapest = min((e["price"] for e in p.pricing), default=None)
            if cheapest and cheapest > req.budget:
                continue

        candidates.append((p, dist))

    if not candidates:
        raise HTTPException(404, "No products found matching your criteria and location.")

    # Sort: deals first, then distance, cap at 40 to keep context tight
    candidates.sort(key=lambda x: (not x[0].is_on_sale, x[1] or 9999))
    candidates = candidates[:40]

    # Build compact product context for the model
    product_context = []
    for p, dist in candidates:
        entry = {
            "id": p.id,
            "name": p.name,
            "brand": p.brand,
            "type": p.product_type,
            "thc": p.thc_pct,
            "cbd": p.cbd_pct,
            "terpenes": p.terpenes,
            "effects": p.effects,
            "pricing": p.pricing,
            "on_sale": p.is_on_sale,
            "sale_pct_off": p.sale_pct_off,
            "dispensary": p.dispensary.name,
            "city": p.dispensary.city,
            "miles_away": round(dist, 1) if dist else None,
        }
        product_context.append(entry)

    user_message = (
        f"User request: {req.query}\n"
        f"Budget: {'$' + str(req.budget) if req.budget else 'no limit'}\n"
        f"Preferred effects: {', '.join(req.preferred_effects) or 'none specified'}\n\n"
        f"Available products:\n{json.dumps(product_context, indent=2)}"
    )

    response = _client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    answer_text = response.content[0].text

    # Extract recommended IDs from the JSON block at the end
    recommended_ids: list[int] = []
    try:
        json_start = answer_text.rfind('{"recommended_ids"')
        if json_start != -1:
            id_data = json.loads(answer_text[json_start:])
            recommended_ids = id_data.get("recommended_ids", [])
            answer_text = answer_text[:json_start].strip()
    except (json.JSONDecodeError, ValueError):
        pass

    # Hydrate the recommended products
    recommended_products = []
    id_to_candidate = {p.id: (p, dist) for p, dist in candidates}
    for pid in recommended_ids:
        if pid in id_to_candidate:
            p, dist = id_to_candidate[pid]
            pout = ProductOut.model_validate(p)
            pout.dispensary = DispensaryOut.model_validate(p.dispensary)
            pout.distance_miles = round(dist, 2) if dist else None
            pout.dispensary.distance_miles = pout.distance_miles
            recommended_products.append(pout)

    return RecommendResponse(answer=answer_text, products=recommended_products)

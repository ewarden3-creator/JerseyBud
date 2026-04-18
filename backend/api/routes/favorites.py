from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from api.deps import DB
from api.schemas import ProductOut, DispensaryOut
from models.favorite import Favorite
from models.product import Product
from models.dispensary import Dispensary

router = APIRouter(prefix="/favorites", tags=["favorites"])


class FavoriteCreate(BaseModel):
    device_id: str
    favorite_type: str           # product | strain | dispensary
    product_id: int | None = None
    strain_name: str | None = None
    dispensary_id: int | None = None


class FavoriteOut(BaseModel):
    id: int
    favorite_type: str
    product_id: int | None
    strain_name: str | None
    dispensary_id: int | None
    # Hydrated data
    product: ProductOut | None = None
    dispensary: DispensaryOut | None = None

    model_config = {"from_attributes": True}


@router.post("", response_model=FavoriteOut, status_code=201)
async def add_favorite(body: FavoriteCreate, db: DB):
    if not any([body.product_id, body.strain_name, body.dispensary_id]):
        raise HTTPException(400, "Provide product_id, strain_name, or dispensary_id")

    fav = Favorite(
        device_id=body.device_id,
        favorite_type=body.favorite_type,
        product_id=body.product_id,
        strain_name=body.strain_name,
        dispensary_id=body.dispensary_id,
    )
    db.add(fav)
    try:
        await db.commit()
        await db.refresh(fav)
    except Exception:
        await db.rollback()
        raise HTTPException(409, "Already favorited")

    return await _hydrate(fav, db)


@router.get("/{device_id}", response_model=list[FavoriteOut])
async def list_favorites(device_id: str, db: DB):
    rows = await db.execute(
        select(Favorite)
        .where(Favorite.device_id == device_id)
        .order_by(Favorite.created_at.desc())
    )
    favs = rows.scalars().all()
    return [await _hydrate(f, db) for f in favs]


@router.delete("/{favorite_id}", status_code=204)
async def remove_favorite(favorite_id: int, device_id: str, db: DB):
    rows = await db.execute(select(Favorite).where(Favorite.id == favorite_id))
    fav = rows.scalar_one_or_none()
    if not fav or fav.device_id != device_id:
        raise HTTPException(404, "Favorite not found")
    await db.delete(fav)
    await db.commit()


async def _hydrate(fav: Favorite, db) -> FavoriteOut:
    out = FavoriteOut(
        id=fav.id,
        favorite_type=fav.favorite_type,
        product_id=fav.product_id,
        strain_name=fav.strain_name,
        dispensary_id=fav.dispensary_id,
    )
    if fav.product_id:
        row = await db.execute(
            select(Product).options(selectinload(Product.dispensary)).where(Product.id == fav.product_id)
        )
        p = row.scalar_one_or_none()
        if p:
            pout = ProductOut.model_validate(p)
            pout.dispensary = DispensaryOut.model_validate(p.dispensary)
            out.product = pout
    if fav.dispensary_id:
        row = await db.execute(select(Dispensary).where(Dispensary.id == fav.dispensary_id))
        d = row.scalar_one_or_none()
        if d:
            out.dispensary = DispensaryOut.model_validate(d)
    return out

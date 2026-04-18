from datetime import date, datetime
from pydantic import BaseModel


class DispensaryOut(BaseModel):
    id: int
    slug: str
    name: str
    address: str
    city: str
    zip_code: str
    lat: float | None
    lng: float | None
    phone: str | None
    website: str | None
    logo_url: str | None
    source: str
    nj_license_number: str | None
    nj_license_url: str | None
    opening_year: int | None
    medical: bool
    recreational: bool
    wheelchair_accessible: bool | None
    delivery: bool | None
    curbside_pickup: bool | None
    atm: bool | None
    hours: dict | None          # {"mon": "10 AM - 8 PM", ..., "sun": ""}
    is_open_now: bool | None = None   # computed by API, not stored
    distance_miles: float | None = None

    model_config = {"from_attributes": True}


class PricingEntry(BaseModel):
    weight: str
    price: float
    original_price: float | None = None
    price_per_gram: float | None = None
    original_price_per_gram: float | None = None
    grams: float | None = None

    model_config = {"from_attributes": True}


class ProductOut(BaseModel):
    id: int
    source_id: str          # platform-native product ID for hand-off URLs
    name: str
    brand: str | None
    strain_name: str | None
    category: str
    subcategory: str | None
    product_type: str | None
    thc_pct: float | None
    cbd_pct: float | None
    cannabinoids: dict | None          # cbn, cbg, cbc, thca, cbda, ...
    terpenes: dict | None
    total_terpenes_pct: float | None
    effects: list | None
    pricing: list[PricingEntry] | None
    is_on_sale: bool
    sale_pct_off: float | None
    best_price_per_gram: float | None
    image_url: str | None
    in_stock: bool
    batch_id: str | None
    harvest_date: date | None
    dispensary: DispensaryOut
    distance_miles: float | None = None

    model_config = {"from_attributes": True}


class DealOut(BaseModel):
    product: ProductOut
    best_price: float
    best_weight: str
    best_price_per_gram: float | None
    original_price: float | None
    sale_pct_off: float | None
    dispensary_name: str
    dispensary_city: str
    distance_miles: float | None


class TrendEntry(BaseModel):
    strain_name: str
    category: str
    product_type: str | None
    avg_thc: float | None
    avg_total_terpenes: float | None
    dispensary_count: int
    avg_price_eighth: float | None
    avg_price_per_gram: float | None


class PriceHistoryPoint(BaseModel):
    recorded_at: datetime
    pricing: list[PricingEntry]
    is_on_sale: bool
    sale_pct_off: float | None
    best_price_per_gram: float | None

    model_config = {"from_attributes": True}


class LabHistoryEntry(BaseModel):
    batch_id: str
    thc_pct: float | None
    cbd_pct: float | None
    cannabinoids: dict | None
    terpenes: dict | None
    total_terpenes_pct: float | None
    harvest_date: date | None
    recorded_at: datetime

    model_config = {"from_attributes": True}


class PriceCompareEntry(BaseModel):
    """Same strain at different dispensaries — for statewide price comparison."""
    dispensary_name: str
    dispensary_city: str
    dispensary_slug: str
    dispensary_source: str       # "dutchie" | "iheartjane" — drives hand-off URL
    dispensary_source_id: str    # iHJ store id / Dutchie internal id
    dispensary_lat: float | None
    dispensary_lng: float | None
    distance_miles: float | None
    pricing: list[PricingEntry]
    best_price_per_gram: float | None
    is_on_sale: bool
    sale_pct_off: float | None
    product_id: int
    product_source_id: str       # iHJ product id for deep-link reserve URL


class MedianPriceOut(BaseModel):
    """Statewide median pricing for a strain/weight — BudWatcher avg price indicator."""
    strain_name: str
    weight: str
    median_price: float
    min_price: float
    max_price: float
    sample_count: int


class RecommendRequest(BaseModel):
    query: str
    lat: float | None = None
    lng: float | None = None
    radius_miles: float = 25
    budget: float | None = None
    preferred_effects: list[str] = []
    preferred_types: list[str] = []


class RecommendResponse(BaseModel):
    answer: str
    products: list[ProductOut]

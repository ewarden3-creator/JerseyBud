from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from api.deps import DB
from models.alert import Alert

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertCreate(BaseModel):
    device_id: str
    alert_type: str                  # price_threshold | back_in_stock | new_drop
    product_id: int | None = None
    strain_name: str | None = None
    target_weight: str | None = None
    threshold_price: float | None = None


class AlertOut(BaseModel):
    id: int
    device_id: str
    alert_type: str
    product_id: int | None
    strain_name: str | None
    target_weight: str | None
    threshold_price: float | None
    is_active: bool
    last_triggered_at: str | None

    model_config = {"from_attributes": True}


@router.post("", response_model=AlertOut, status_code=201)
async def create_alert(body: AlertCreate, db: DB):
    if not body.product_id and not body.strain_name:
        raise HTTPException(400, "Provide product_id or strain_name")
    if body.alert_type == "price_threshold" and body.threshold_price is None:
        raise HTTPException(400, "price_threshold alerts require threshold_price")

    alert = Alert(
        device_id=body.device_id,
        alert_type=body.alert_type,
        product_id=body.product_id,
        strain_name=body.strain_name,
        target_weight=body.target_weight,
        threshold_price=body.threshold_price,
        is_active=True,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return AlertOut.model_validate(alert)


@router.get("/{device_id}", response_model=list[AlertOut])
async def list_alerts(device_id: str, db: DB):
    rows = await db.execute(
        select(Alert)
        .where(Alert.device_id == device_id, Alert.is_active == True)
        .order_by(Alert.created_at.desc())
    )
    return [AlertOut.model_validate(a) for a in rows.scalars().all()]


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(alert_id: int, device_id: str, db: DB):
    rows = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = rows.scalar_one_or_none()
    if not alert or alert.device_id != device_id:
        raise HTTPException(404, "Alert not found")
    alert.is_active = False
    await db.commit()

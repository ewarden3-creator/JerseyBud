"""
Reference data for filter UIs — canonical cannabinoid and terpene lists
matching the full set BudWatcher exposes, plus NJ-specific metadata.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/meta", tags=["meta"])

# Canonical cannabinoid list — matches NJ COA lab report fields
CANNABINOIDS = [
    {"key": "thc",   "label": "THC",   "group": "major"},
    {"key": "thca",  "label": "THCa",  "group": "major"},
    {"key": "d9",    "label": "D9",    "group": "major"},
    {"key": "d8",    "label": "D8",    "group": "minor"},
    {"key": "thcv",  "label": "THCV",  "group": "minor"},
    {"key": "thcva", "label": "THCVa", "group": "minor"},
    {"key": "cbd",   "label": "CBD",   "group": "major"},
    {"key": "cbda",  "label": "CBDa",  "group": "major"},
    {"key": "cbdv",  "label": "CBDV",  "group": "minor"},
    {"key": "cbn",   "label": "CBN",   "group": "minor"},
    {"key": "cbna",  "label": "CBNa",  "group": "minor"},
    {"key": "cbg",   "label": "CBG",   "group": "minor"},
    {"key": "cbga",  "label": "CBGa",  "group": "minor"},
    {"key": "cbc",   "label": "CBC",   "group": "minor"},
    {"key": "cbca",  "label": "CBCa",  "group": "minor"},
    {"key": "cbl",   "label": "CBL",   "group": "rare"},
    {"key": "cbla",  "label": "CBLa",  "group": "rare"},
]

# Canonical terpene list — all terpenes appearing on NJ COA lab reports
TERPENES = [
    # Most common
    {"key": "beta_myrcene",       "label": "Beta Myrcene",       "group": "common"},
    {"key": "beta_caryophyllene", "label": "Beta Caryophyllene", "group": "common"},
    {"key": "limonene",           "label": "Limonene",           "group": "common"},
    {"key": "alpha_pinene",       "label": "Alpha Pinene",       "group": "common"},
    {"key": "beta_pinene",        "label": "Beta Pinene",        "group": "common"},
    {"key": "linalool",           "label": "Linalool",           "group": "common"},
    {"key": "alpha_humulene",     "label": "Alpha Humulene",     "group": "common"},
    {"key": "terpinolene",        "label": "Terpinolene",        "group": "common"},
    {"key": "ocimene",            "label": "Ocimene",            "group": "common"},
    {"key": "alpha_bisabolol",    "label": "Alpha Bisabolol",    "group": "common"},
    # Secondary
    {"key": "camphene",           "label": "Camphene",           "group": "secondary"},
    {"key": "alpha_terpinene",    "label": "Alpha Terpinene",    "group": "secondary"},
    {"key": "gamma_terpinene",    "label": "Gamma Terpinene",    "group": "secondary"},
    {"key": "delta_3_carene",     "label": "Delta-3-Carene",     "group": "secondary"},
    {"key": "fenchol",            "label": "Fenchol",            "group": "secondary"},
    {"key": "borneol",            "label": "Borneol",            "group": "secondary"},
    {"key": "valencene",          "label": "Valencene",          "group": "secondary"},
    {"key": "nerolidol",          "label": "Nerolidol",          "group": "secondary"},
    {"key": "geraniol",           "label": "Geraniol",           "group": "secondary"},
    {"key": "pulegone",           "label": "Pulegone",           "group": "secondary"},
    {"key": "sabinene",           "label": "Sabinene",           "group": "secondary"},
    {"key": "p_cymene",           "label": "p-Cymene",           "group": "secondary"},
    {"key": "eucalyptol",         "label": "Eucalyptol",         "group": "secondary"},
    {"key": "caryophyllene_oxide","label": "Caryophyllene Oxide","group": "secondary"},
    {"key": "guaiol",             "label": "Guaiol",             "group": "secondary"},
    {"key": "isopulegol",         "label": "Isopulegol",         "group": "secondary"},
    {"key": "trans_nerolidol",    "label": "Trans-Nerolidol",    "group": "secondary"},
    {"key": "trans_ocimene",      "label": "Trans-Ocimene",      "group": "secondary"},
]

CATEGORIES = [
    {"key": "flower",      "label": "Flower"},
    {"key": "concentrate", "label": "Concentrate"},
    {"key": "edible",      "label": "Edible"},
    {"key": "vaporizer",   "label": "Vaporizer / Cart"},
    {"key": "tincture",    "label": "Tincture"},
    {"key": "topical",     "label": "Topical"},
    {"key": "pre-roll",    "label": "Pre-Roll"},
]

PRODUCT_TYPES = [
    {"key": "sativa",  "label": "Sativa"},
    {"key": "indica",  "label": "Indica"},
    {"key": "hybrid",  "label": "Hybrid"},
    {"key": "cbd",     "label": "CBD"},
]

WEIGHT_OPTIONS = [
    {"key": "0.5g",  "label": "0.5g",    "grams": 0.5},
    {"key": "1g",    "label": "1g",       "grams": 1.0},
    {"key": "2g",    "label": "2g",       "grams": 2.0},
    {"key": "3.5g",  "label": "1/8 oz",  "grams": 3.5},
    {"key": "7g",    "label": "1/4 oz",  "grams": 7.0},
    {"key": "14g",   "label": "1/2 oz",  "grams": 14.0},
    {"key": "28g",   "label": "1 oz",    "grams": 28.0},
]


@router.get("/cannabinoids")
async def list_cannabinoids():
    return CANNABINOIDS


@router.get("/terpenes")
async def list_terpenes():
    return TERPENES


@router.get("/filters")
async def get_filter_options():
    """Single call to hydrate the entire filter panel."""
    return {
        "cannabinoids": CANNABINOIDS,
        "terpenes": TERPENES,
        "categories": CATEGORIES,
        "product_types": PRODUCT_TYPES,
        "weight_options": WEIGHT_OPTIONS,
    }

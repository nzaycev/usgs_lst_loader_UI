import numpy


def calcNDVI(B5, B4):
    sum = (B5 + B4)
    ndvi = numpy.where((sum != 0) & (B5 != numpy.nan) & (B4 != numpy.nan), (B5 - B4) / sum, numpy.nan)
    from scipy.ndimage.filters import gaussian_filter
    ndvi = numpy.where(ndvi != 1, ndvi, numpy.nan)
    filtered = gaussian_filter(ndvi, sigma=(2,2), mode="nearest")
    return ndvi, numpy.nanmin(filtered), numpy.nanmax(filtered)

def calcEmission(vegProp):
    return numpy.add(
        numpy.multiply(
            vegProp,
            0.004
        ),
        0.986
    )

def calcVegProp(NDVI, min, max):
    diff = max - min
    base = (NDVI - min)
    b = base / diff
    return numpy.power(b, 2.0)

def calcSurfRad(ST_TRAD, ST_URAD, ST_ATRAN):
    diff = ST_TRAD - ST_URAD
    return numpy.where(diff != 0, diff / ST_ATRAN, numpy.nan)

def calcRadiance(SurfRad, Emission, ST_DRAD):
    return numpy.subtract(
        SurfRad,
        numpy.multiply(
            numpy.subtract(
                1,
                Emission
            ),
            ST_DRAD
        )
    )

def calcBT(Radiance, satelliteId = '8'):
    K1 = 774.8853 if satelliteId == '8' else 799.0284
    K2 = 1321.0789 if satelliteId == '8' else 1329.2405

    log = numpy.log(
        numpy.add(
            numpy.divide(
                K1,
                Radiance
            ),
            1
        )
    )

    return numpy.where(log != 0,
        numpy.divide(
            K2,
            log
        )
    , numpy.nan)

def calcLST(BT, Emission):
    lmbd = 10.9
    alph = 14388

    lst = BT / (1 + lmbd * BT * numpy.log(Emission) / alph) - 273.15
    return lst
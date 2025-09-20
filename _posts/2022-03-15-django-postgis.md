---
layout: post
title: "Location-based application using Django and PostGIS"
date: 2022-03-15
tags:
  - Django
  - Database
  - Python
author: Adesh Nalpet Adimurthy
feature: assets/featured/geo-django-popeye.png
category: Django Rango
---

In a prior post, the experiment on [hybrid spatial-index](https://www.pyblog.xyz/hybrid-spatial-index) to find spatial data points is worth exploring, but the in-memory implementations and the lack of ability to scale make it almost pointless to use it in real-world applications.

In a web application that requires storage and accessing spatial data (co-ordinates), a combination of Django, PostgreSQL (PostGIS), GeoDjango, and Leaflet (or Google Maps) solves most of the preliminary use cases.

## The Local Set-up

- Install Dependencies
- Start PostgreSQL Server
- Configure Django Application

### Install virtualenv

As always, when working on python projects, always use `virtualenv` or `conda env`. If you don't have `virtualenv` already installed, install it ([Reference](https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/)): 

```
python3 -m pip install --user --upgrade pip
python3 -m pip --version
python3 -m pip install --user virtualenv
```

### Install Dependencies

Create an environment for the project, replace `env` with the appropriate name:

```
python3 -m venv env
source env/bin/activate
python3 -m pip install -r requirements.txt
```

The contents of `requirements.txt`:

```
Django==4.0.2
django-leaflet==0.28.2
psycopg2-binary==2.9.3
gunicorn==20.1.0
```

Of course, you don't need `gunicorn` here, just a practice to remember to not use the development server in production (which I often see in other blog posts).

### Install Prerequisites

PostGIS is a spatial database extender for PostgreSQL object-relational database. It supports geographic objects allowing location queries to be run in SQL.

```
brew install postgresql
brew install postgis
brew install gdal
brew install libgeoip
```

Make sure `psycopg2-binary` is already installed as mentioned in `requirements.txt`

### Start PostgreSQL server

While you can install `PostgreSQL` server locally, using docker makes it a lot easier without any hassle apart from ensuring docker is installed.

Start docker in your local machine and run:

```
docker run --name=postgis -d -e POSTGRES_USER=<database-username> -e POSTGRES_PASS=<database-password> -e POSTGRES_DBNAME=<database-name> -p 5432:5432 kartoza/postgis:14-3.2
```

and replace `<database-username>` and `<database-password>`, `<database-name>` as per your needs.

## Django Project Set-up

Configure PostGIS database, INSTALLED_APPS, and Leaflet in `settings.py`

### DATABASES

Assuming that you already have a Django project handy, in `settings.py`, the `database`:

```
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': config('DATABASE_NAME'),
        'USER': config('DATABASE_USER'),
        'PASSWORD': config('DATABASE_PASSWORD'),
        'HOST': config('HOST_ENDPOINT'),
        'PORT': '5432',
    }
}
```

If you are using the Mac M1, you'll need to add the full path to `gdal`, for local set-up, simply add the below two files in `settings.py`

```
GDAL_LIBRARY_PATH = '/opt/homebrew/opt/gdal/lib/libgdal.dylib'
GEOS_LIBRARY_PATH = '/opt/homebrew/opt/geos/lib/libgeos_c.dylib'
```

### INSTALLED_APPS

Add `django.contrib.gis` to `INSTALLED_APPS` in `settings.py`.
If you are using Leaflet, install `django-leaflet` and add `leaflet` to `INSTALLED_APPS` in `settings.py`.

### LEAFLET_CONFIG

Add `LEAFLET_CONFIG` configuration in `settings.py`

```
LEAFLET_CONFIG = {
    'DEFAULT_CENTER': (44.638569, -63.586262),
    'DEFAULT_ZOOM': 18,
    'MAX_ZOOM': 20,
    'MIN_ZOOM': 3,
    'SCALE': 'both',
    'ATTRIBUTION_PREFIX': 'Location Tracker'
}
```

Lastly, Leaflet might need `static`; make sure to add the path in `settings.py`:

### STATIC

`static` file(s) relative path from the root directory:

```
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
```

## Django Models

Let's say you have a model called `Trip`, which has the source and destination address (co-ordinates: Latitude and Longitude).

```
class Trip(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_location = models.PointField(null=True)
    destination_location = models.PointField(null=True)
```

in `admin.py`:

```
from leaflet.admin import LeafletGeoAdmin
from .models import Trip

class TripAdmin(LeafletGeoAdmin):
    list_display = ('source_location', 'destination_location')

admin.site.register(Trip, TripAdmin)
```

### Run migrations, Create a superuser and Start the development server

```
python3 manage.py makemigrations
python3 manage.py migrate

python3 manage.py createsuperuser

python3 manage.py runserver
```

Finally, head to `http://localhost:8000/admin`, enter the username and password, and navigate to the model (`Trip`), which has the location fields, to create an entry.

### Code Snippet

To search for trips for `source_location` within a radius

```
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance
from .models import Trip

def get_trips(latitude, longitude, radius):
    point = Point(latitude, longitude)
    trips = Trip.objects.filter(source_location__distance_lt=(point, Distance(km=radius)))
    return trips
```

That's about it! While this is not a complete list of features of GeoDjango, refer to the documentation here: [https://docs.djangoproject.com/en/4.0/ref/contrib/gis/tutorial/#](https://docs.djangoproject.com/en/4.0/ref/contrib/gis/tutorial/#) for more details.

As always, the reference code: [https://github.com/addu390/dedo](https://github.com/addu390/dedo)
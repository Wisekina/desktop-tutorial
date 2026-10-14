const destination = new URL('./public/', location.href);
destination.hash = location.hash;
location.replace(destination.href);

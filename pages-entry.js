const destination = new URL('./public/', location.href);
destination.search = location.search;
destination.hash = location.hash;
location.replace(destination.href);

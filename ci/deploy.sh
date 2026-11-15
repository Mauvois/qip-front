#!/bin/sh
set -eu

: "${CI_COMMIT_SHA:?Missing commit SHA}"
export QIP_FRONT_IMAGE="qip_front_prod:$CI_COMMIT_SHA"
docker network inspect qip_backend_net >/dev/null
docker volume inspect qip_static >/dev/null
docker inspect qip_api_prod --format '{{.State.Health.Status}}' | grep -qx healthy

# Keep the existing project, container, network, volume and published port.
docker compose -f docker/prod/docker-compose.prod.yml -p qip_front_prod \
    up -d --no-build --wait --wait-timeout 120 frontend

actual=$(curl --fail --silent --show-error --retry 12 --retry-delay 5 \
    --retry-all-errors --max-time 15 \
    "https://qip.taan.ovh/deployment-version.txt?commit=$CI_COMMIT_SHA")
test "$actual" = "$CI_COMMIT_SHA"
curl --fail --silent --show-error --retry 6 --retry-delay 5 --retry-all-errors \
    --max-time 15 https://qip.taan.ovh/api/terms/ -o /dev/null
printf 'Verified public frontend commit: %s\n' "$actual"

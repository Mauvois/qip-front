# Livraison du frontend

Push sur `staging` → tests Node et build Vite → image `qip_front_prod:<SHA>` →
déploiement sur le Docker du Mac via Woodpecker. Les pull requests et `main`
ne déploient pas. Seuls les contributeurs de confiance doivent pouvoir pousser
sur cette branche (le pipeline dispose du socket Docker).

Le Compose conserve le conteneur `qip_front_prod`, le port `127.0.0.1:8012`, le
réseau `qip_backend_net` et le volume externe `qip_static`. Le tunnel Cloudflare
et `qip.taan.ovh` restent inchangés. L'API doit déjà être saine.

Le dossier hôte `/Users/serveur/docker/qip/ci-state/` doit exister et être montable
par Woodpecker. Son fichier `deploy.lock` est partagé avec le pipeline backend.
Le backend doit être publié en premier pour une évolution couplée compatible.

L'image expose `/deployment-version.txt` (sans cache), contenant le SHA compilé.
Le pipeline vérifie ce contenu via HTTPS public ainsi que `/api/terms/` :

```sh
curl -fsS "https://qip.taan.ovh/deployment-version.txt?check=$(date +%s)"
```

Une intervention Compose manuelle doit exporter
`QIP_FRONT_IMAGE=qip_front_prod:<SHA>` et utiliser `--no-build` pour conserver
l'image livrée. Une recréation peut causer une brève interruption. Les anciennes
images ne sont pas supprimées ; un retour arrière front se fait sous le même
verrou en sélectionnant un SHA précédent. Aucun rollback de base n'est implicite.

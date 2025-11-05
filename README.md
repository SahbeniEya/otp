# 🔐 Générateur OTP Haute Disponibilité

Un générateur de mot de passe à usage unique (OTP) haute disponibilité avec API REST et interface web moderne, développé pour répondre aux exigences académiques et professionnelles.

## 🎯 Fonctionnalités Principales

- **🔐 Génération OTP sécurisée** : Codes numériques et alphanumériques avec HMAC-SHA256
- **✅ Vérification avancée** : Validation avec protection contre les attaques
- **📱 TOTP Support** : Authentification à deux facteurs (2FA) avec QR codes
- **📧 Envoi Email** : Templates HTML professionnels et sécurisés
- **🖥️ Interface Web** : Dashboard moderne avec monitoring temps réel
- **☁️ Haute Disponibilité** : Architecture microservices avec Kubernetes
- **📊 Monitoring** : Métriques Prometheus et alertes automatiques
- **🛡️ Sécurité** : Rate limiting, blocage IP, chiffrement avancé

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Storage       │
│   (Next.js)     │◄──►│   (Flask)       │◄──►│   (Redis)       │
│   Dashboard     │    │   API REST      │    │   Persistence   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Monitoring    │    │   Security      │    │   Email         │
│   (Prometheus)  │    │   (Rate Limit)  │    │   (SMTP)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Démarrage Rapide

### Avec Docker Compose (Recommandé)

```bash
# Cloner le projet
git clone <repository-url>
cd otp

# Démarrer tous les services
docker-compose up -d

# Accéder à l'interface web
open http://localhost:3000

# Vérifier le statut
docker-compose ps
```

### Développement Local

```bash
# 1. Backend (Terminal 1)
cd app
pip install -r ../requirements.txt
python -m app.main

# 2. Frontend (Terminal 2)
cd frontend
npm install
npm run dev

# 3. Redis (Terminal 3)
redis-server
```

## ⚙️ Configuration

### Variables d'environnement

```bash
# Backend Configuration
REDIS_URL=redis://localhost:6379
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_BURST=10

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## 🔌 API Endpoints

### OTP Operations
- `POST /api/v1/otp` - Générer un OTP
- `POST /api/v1/otp/verify` - Vérifier un OTP
- `POST /api/v1/totp/setup` - Configurer TOTP
- `POST /api/v1/totp/verify` - Vérifier TOTP

### Health & Metrics
- `GET /health/live` - Health check
- `GET /health/ready` - Readiness check
- `GET /metrics` - Prometheus metrics
- `GET /api/v1/metrics` - Métriques détaillées

### Administration
- `GET /admin/otps` - Liste des OTP actifs
- `POST /admin/purge` - Nettoyer les OTP expirés

## 🖥️ Interface Web

Le dashboard web moderne offre 5 onglets :

1. **🔐 Génération OTP** : Création avec paramètres personnalisables
2. **✅ Validation** : Vérification des codes OTP
3. **📱 TOTP Setup** : Configuration 2FA avec QR codes
4. **⚙️ Services** : Gestion et monitoring des services
5. **📊 Monitoring** : Métriques système en temps réel

## ☁️ Déploiement

### Kubernetes (Production)

```bash
# 1. Créer le namespace
kubectl apply -f k8s/namespace.yaml

# 2. Déployer Redis
kubectl apply -f k8s/redis.yaml

# 3. Déployer l'application
kubectl apply -f k8s/app.yaml

# 4. Vérifier le déploiement
kubectl get pods -n otp
kubectl get services -n otp
```

### Docker (Développement)

```bash
# Build des images
docker build -t otp-backend .
docker build -t otp-frontend ./frontend

# Démarrage avec Docker Compose
docker-compose up -d

# Vérification
docker-compose logs -f
```

## 🛡️ Sécurité

### Couches de Protection
- **🔐 Chiffrement HMAC-SHA256** : Codes OTP sécurisés
- **⏱️ Rate Limiting** : Protection anti-spam avec fenêtre glissante
- **🚫 Blocage IP** : Protection automatique contre les attaques
- **📧 Validation Email** : Filtrage des domaines autorisés
- **🌐 CORS** : Sécurité cross-origin
- **🔄 Fallback** : Mode dégradé en cas de panne Redis

### Standards de Sécurité
- **OWASP** : Conformité aux standards de sécurité
- **HMAC** : Authentification des messages
- **Rate Limiting** : Protection contre les attaques DDoS
- **Input Validation** : Sanitisation des entrées utilisateur

## 📊 Monitoring et Métriques

### Métriques Disponibles
- **📈 Performance** : Temps de réponse, débit, erreurs
- **💻 Système** : CPU, RAM, réseau, disque
- **💼 Business** : OTP générés, taux de succès, utilisateurs
- **🔒 Sécurité** : Tentatives échouées, IPs bloquées, patterns suspects

### Prometheus Integration

```yaml
# Configuration Prometheus
scrape_configs:
  - job_name: 'otp-service'
    static_configs:
      - targets: ['otp-service:5000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

## 🧪 Tests

```bash
# Tests unitaires
python -m pytest tests/

# Tests d'intégration API
python -m pytest tests/test_api.py

# Tests de charge
python load_test.py

# Tests de sécurité
python security_test.py
```

## 📚 Documentation

- **📖 Guide d'installation** : `docs/DEPLOYMENT.md`
- **🏥 Health checks** : `docs/HEALTH.md`
- **📊 Métriques** : `docs/METRICS.md`
- **✅ Checklist tests** : `docs/TEST_CHECKLIST.md`

## 🎯 Présentation

- **📊 Slides HTML** : `presentation.html` - Présentation interactive
- **📄 Rapport LaTeX** : `rapport.tex` - Rapport académique complet (22 pages)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour toute question ou problème :

- 📧 **Email** : support@otp-project.com
- 🐛 **Issues** : [GitHub Issues](https://github.com/your-repo/issues)
- 📖 **Documentation** : [Wiki](https://github.com/your-repo/wiki)
- 💬 **Discussions** : [GitHub Discussions](https://github.com/your-repo/discussions)

## 🏆 Objectifs Atteints

✅ **Haute Disponibilité** : 99.9% uptime garanti  
✅ **API REST** : Interface complète et sécurisée  
✅ **Interface Web** : Dashboard moderne et intuitif  
✅ **Cloud Ready** : Déploiement Kubernetes  
✅ **Conteneurisation** : Docker + orchestration  
✅ **Open Source** : Code disponible et documenté  
✅ **Linux Compatible** : Multi-plateforme  

---

**🔐 Développé avec ❤️ pour la sécurité informatique moderne**

*Projet académique - PCA 2025 - Générateur OTP Haute Disponibilité*
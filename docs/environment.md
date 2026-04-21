# Environment Setup Guide

## 📌 Overview

Dự án sử dụng biến môi trường để quản lý cấu hình và tránh lộ thông tin nhạy cảm.

---

## 🧪 Development

1. Copy file:
   cp .env.example .env

2. Chỉnh sửa:
   - DB_URL
   - DB_USERNAME
   - DB_PASSWORD

3. Run project:
   SPRING_PROFILES_ACTIVE=dev

---

## 🚀 Production

- Không dùng `.env` local
- Config ENV trực tiếp trên server hoặc Docker

Ví dụ:
DB_URL=jdbc:mysql://mysql:3306/ticketing
DB_USERNAME=root
DB_PASSWORD=secure_password

---

## ⚠️ Important Rules

- ❌ Không commit `.env`
- ❌ Không hardcode password trong code
- ✅ Luôn dùng biến ${...} trong application.yml

---

## 🧠 Naming Convention

| File         | Purpose               |
| ------------ | --------------------- |
| .env         | Local development     |
| .env.example | Template              |
| .env.prod    | Production (optional) |

---

## 🔥 Common Issues

- Sai profile → check SPRING_PROFILES_ACTIVE
- DB không connect → check DB_URL
- Docker không nhận ENV → check docker-compose.yml

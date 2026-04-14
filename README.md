# ITPJ2602 - Online Event Management & Ticketing System

![Status](https://img.shields.io/badge/Status-In%20Progress-yellow)
![Methodology](https://img.shields.io/badge/Methodology-Scrum-blue)
![Type](https://img.shields.io/badge/Type-Web%20%26%20Mobile-green)

## 1. Project Overview
This project is developed to solve operational challenges for **Dề Dê**—a fast-growing startup organizing 15–20 events annually (concerts, seminars, workshops). The system focuses on automating the ticketing process, managing seat allocations, and preventing fraud, replacing the current manual Facebook and bank transfer workflow.

### Business Problems
* **Revenue Loss:** High prevalence of counterfeit tickets due to lack of verification.
* **System Instability:** Frequent crashes during "Golden Hour" ticket releases.
* **Operational Bottlenecks:** Slow manual ticket checking at the gate causing congestion.
* **Lack of Insights:** No data on customer behavior for marketing optimization.

## 2. Project Objectives
* **High Performance:** Support **10,000 concurrent users** (simulated).
* **Speed:** System response time `< 2 seconds`.
* **Operational Efficiency:** Check-in time `< 5 seconds per person`.
* **Business Growth:** Increase ticket revenue by **20%** through a streamlined professional system.

## 3. Scope of Work
### 🌐 Web Application (Admin & Customer Portal)
* **Event Management:** Create and manage multiple events simultaneously.
* **Dynamic Seating Map:** Real-time seat selection for users.
* **Online Payment:** Integrated (mock) payment gateway with a **retry mechanism** for failed transactions.
* **QR Code Generation:** Unique QR codes generated for every ticket sold.
* **Reporting & Analytics:** Sales reports, revenue tracking, and customer behavior insights.

### 📱 Mobile App Module (Staff Check-in)
* **QR Scanner:** High-speed scanning to verify ticket validity.
* **Offline Mode:** Capability to function without an internet connection for short periods at event venues.

## 4. Constraints & Requirements
* **Timeline:** 05 months.
* **Budget:** 1.5 Billion VNĐ.
* **Team Size:** 05 members.
* **Success Criteria:**
    * Zero crashes during 10,000 concurrent user simulation.
    * Payment transaction success rate `> 98%`.
    * Zero duplicate QR codes.
    * System capacity to manage at least `50,000 tickets` per event.

## 5. Project Management
* **Methodology:** Scrum.
* **Development Model:** Incremental / Iterative.
* **Risk Management:**
    * Bot attack mitigation during high-traffic sales.
    * Anti-fraud solutions for ticket verification.
    * Data synchronization after offline mobile usage.

## 6. Initial Assumptions
* The Payment Gateway provides a stable sandbox API for simulation.
* Target customers use smartphones with stable internet access (primary).
* The event venue provides stable internet for real-time synchronization.

---
**Project: Capstone Project 2 - Course Code: ITPJ2602**
*Thank you for visiting this repository!*

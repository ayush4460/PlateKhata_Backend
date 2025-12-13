# Backend Testing Guide

## 1. Unit & Integration Tests (Jest)
Run unit and integration tests to verify business logic and API endpoints.

**Command:**
```bash
npm test
```
**Watch Mode:**
```bash
npm run test:watch
```

## 2. Performance Tests (Artillery)
Load test the API using Artillery (installed as dev dependency).

**Config:** `tests/performance/load.yml`

**Command:**
```bash
npm run test:load
```
*This will automatically start the server, run the test, and shut it down.*

## 3. Security Checks
Audit dependencies for known vulnerabilities.
**Command:**
```bash
npm audit
```

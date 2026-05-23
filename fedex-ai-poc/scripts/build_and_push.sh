#!/bin/bash
# build_and_push.sh — Build and push frontend/backend images to ECR.
# Usage: bash scripts/build_and_push.sh <aws-account-id> <aws-region> [tag]
#
# Prerequisites:
#   - AWS CLI configured (profile or IAM role)
#   - Docker authenticated with ECR: aws ecr get-login-password | docker login ...
#   - ECR repositories already created

set -e

ACCOUNT_ID="${1:-$(aws sts get-caller-identity --query Account --output text)}"
REGION="${2:-us-east-1}"
TAG="${3:-latest}"

ECR_BASE="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "Building images for ECR: ${ECR_BASE}"
echo "Tag: ${TAG}"
echo ""

# Authenticate with ECR
aws ecr get-login-password --region "${REGION}" | \
    docker login --username AWS --password-stdin "${ECR_BASE}"

# ── Backend ──────────────────────────────────────────────────
echo "Building backend..."
docker build -t ai-backend ./backend
docker tag ai-backend:latest "${ECR_BASE}/ai-analytics-backend:${TAG}"
docker push "${ECR_BASE}/ai-analytics-backend:${TAG}"
echo "✓ Backend pushed: ${ECR_BASE}/ai-analytics-backend:${TAG}"

# ── Frontend ─────────────────────────────────────────────────
echo "Building frontend..."
docker build -t ai-frontend ./frontend
docker tag ai-frontend:latest "${ECR_BASE}/ai-analytics-frontend:${TAG}"
docker push "${ECR_BASE}/ai-analytics-frontend:${TAG}"
echo "✓ Frontend pushed: ${ECR_BASE}/ai-analytics-frontend:${TAG}"

echo ""
echo "✓ All images pushed. Update task definitions with new image URIs."

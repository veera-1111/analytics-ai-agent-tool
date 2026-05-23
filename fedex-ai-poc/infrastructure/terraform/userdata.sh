#!/bin/bash
# Enable logging for userdata
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=== Starting deployment user data ==="

# 1. Update and install packages
apt-get update -y
apt-get install -y docker.io docker-compose git curl

# 2. Start and enable Docker
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# 3. Clone the repository
cd /home/ubuntu
git clone https://github.com/veera-1111/analytics-ai-agent-tool.git
chown -R ubuntu:ubuntu analytics-ai-agent-tool

# 4. Configure environment files
cd analytics-ai-agent-tool/fedex-ai-poc
cp .env.example .env

# Edit .env for production deploy
sed -i 's/AI_PROVIDER=mock/AI_PROVIDER=bedrock/' .env
sed -i 's/AWS_REGION=us-east-1/AWS_REGION=us-east-1/' .env
sed -i 's/BEDROCK_MODEL_ID=us.meta.llama3-1-70b-instruct-v1:0/BEDROCK_MODEL_ID=us.meta.llama3-1-70b-instruct-v1:0/' .env
sed -i 's/AWS_PROFILE=anuruhu-dev/# AWS_PROFILE=anuruhu-dev/' .env

# Remove host ~/.aws mount since we are using IAM instance profile credentials
sed -i 's|- ~/.aws:/root/.aws:ro|# - ~/.aws:/root/.aws:ro|' docker-compose.yml

# 5. Build and launch containers
echo "=== Building and starting Docker Compose ==="
docker-compose up --build -d

# Wait for backend to be ready
echo "=== Waiting for backend services to be healthy ==="
for i in {1..30}; do
  if curl -s http://localhost:8000/api/health | grep -q "healthy"; then
    echo "Backend is healthy!"
    break
  fi
  sleep 2
done

# 6. Initialize database and seed sample data
echo "=== Seeding database ==="
docker-compose exec -T backend python -m app.database.init
docker-compose exec -T backend python -m app.database.seed --profile sample

echo "=== Deployment finished successfully ==="

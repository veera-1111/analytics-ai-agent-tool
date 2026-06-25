# ── Amplify App ───────────────────────────────────────────────────────────
resource "aws_amplify_app" "frontend" {
  name       = "${local.name_prefix}-frontend"
  repository = "https://github.com/veera-1111/${var.github_repo_name}"

  access_token = var.amplify_github_token

  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - cd fedex-ai-poc/frontend
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: fedex-ai-poc/frontend/.next
        files:
          - '**/*'
      cache:
        paths:
          - fedex-ai-poc/frontend/node_modules/**/*
  EOT

  environment_variables = {
    NEXT_PUBLIC_API_BASE_URL = "${aws_apigatewayv2_api.backend.api_endpoint}/api"
    AMPLIFY_MONOREPO_APP_ROOT = "fedex-ai-poc/frontend"
    _LIVE_UPDATES = "[{\"name\":\"Next.js version\",\"pkg\":\"next-version\",\"type\":\"internal\",\"version\":\"latest\"}]"
  }

  custom_rule {
    source = "/ai/<*>"
    target = "/ai/<*>"
    status = "200"
  }

  custom_rule {
    source = "/<*>"
    target = "/index.html"
    status = "404"
  }

  tags = { Name = "${local.name_prefix}-frontend" }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = "main"
  framework   = "Next.js - SSR"
  stage       = "PRODUCTION"

  enable_auto_build = true

  environment_variables = {
    NEXT_PUBLIC_API_BASE_URL = "${aws_apigatewayv2_api.backend.api_endpoint}/api"
  }
}

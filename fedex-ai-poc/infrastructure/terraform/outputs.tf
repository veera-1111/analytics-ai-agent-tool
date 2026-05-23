output "instance_id" {
  value       = aws_instance.app.id
  description = "The EC2 Instance ID"
}

output "public_ip" {
  value       = aws_instance.app.public_ip
  description = "The public IP address of the EC2 instance"
}

output "public_dns" {
  value       = aws_instance.app.public_dns
  description = "The public DNS name of the EC2 instance"
}

output "app_url" {
  value       = "http://${aws_instance.app.public_ip}:8080/ai/chat"
  description = "The public URL to open the analytics chatbot interface"
}

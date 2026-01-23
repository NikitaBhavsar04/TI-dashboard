# AWS Deployment Requirements for Threat-Advisory Platform

## Project Overview
**Project Name:** EaglEye IntelDesk - Threat Advisory Platform  
**Type:** Next.js Web Application + Python Backend + Databases  
**Purpose:** Cybersecurity Intelligence Platform with Real-time Threat Monitoring

---

## 1. COMPUTE REQUIREMENTS

### A. EC2 Instance for Application Server
**Recommended:** `t3.xlarge` or `t3.2xlarge`

| Component | Specification |
|-----------|--------------|
| **vCPUs** | 4-8 cores |
| **RAM** | 16-32 GB |
| **Storage** | 100-200 GB SSD (gp3) |
| **OS** | Ubuntu 22.04 LTS or Amazon Linux 2023 |
| **Network** | Enhanced networking enabled |

**Justification:**
- Next.js application requires 4-8GB RAM
- Node.js runtime needs adequate CPU for concurrent requests
- Python backend processing (LLM calls, data extraction) is CPU-intensive
- Email scheduling with Agenda.js needs consistent memory

---

## 2. DATABASE REQUIREMENTS

### A. MongoDB Atlas (Managed Service - Recommended)
**Cluster Tier:** M10 or M20

| Specification | Details |
|--------------|---------|
| **RAM** | 2-8 GB |
| **Storage** | 50-100 GB |
| **Backup** | Automated daily backups |
| **Region** | Same as EC2 (low latency) |
| **Estimated Cost** | $57-$200/month |

**Data Stored:**
- User accounts and authentication
- Email tracking records
- Scheduled email jobs
- Advisory metadata
- Client information
- Analytics data

**Alternative:** Self-hosted MongoDB on EC2 (t3.medium with 50GB EBS)

---

### B. OpenSearch Service (AWS Managed)
**Domain Configuration:** Development or Production tier

| Specification | Details |
|--------------|---------|
| **Instance Type** | `t3.medium.search` (Dev) or `r6g.large.search` (Prod) |
| **Nodes** | 2-3 data nodes (HA) |
| **Storage per Node** | 100-200 GB EBS (gp3) |
| **RAM** | 4-8 GB per node |
| **Master Nodes** | 3 (for HA, optional) |
| **Estimated Cost** | $100-$400/month |

**Data Stored:**
- Raw threat articles (from RSS feeds)
- Generated advisories
- Full-text search indices
- IOCs (Indicators of Compromise)
- Threat intelligence data

---

## 3. STORAGE REQUIREMENTS

### A. EBS Volumes
| Purpose | Size | Type | IOPS |
|---------|------|------|------|
| OS + Application | 30 GB | gp3 | 3000 |
| Logs | 20 GB | gp3 | 3000 |
| Workspace/Templates | 30 GB | gp3 | 3000 |
| Backup | 50 GB | gp3 | 3000 |

**Total EBS:** ~130 GB

### B. S3 Buckets
| Purpose | Estimated Size | Storage Class |
|---------|---------------|---------------|
| Advisory PDFs/HTML | 10-50 GB/year | Standard |
| Email Templates | 1 GB | Standard |
| Backup/Archive | 50-100 GB | Glacier |
| Logs (CloudWatch) | 10 GB/month | Standard |

**Total S3:** ~100-200 GB

---

## 4. NETWORKING REQUIREMENTS

### A. VPC Configuration
- **VPC:** 1 custom VPC
- **Subnets:** 2 public + 2 private (multi-AZ)
- **NAT Gateway:** 1 (for private subnet internet access)
- **Internet Gateway:** 1
- **Security Groups:** 3-4 (app, db, opensearch, admin)

### B. Load Balancer
**Type:** Application Load Balancer (ALB)
- **Capacity Units:** 25 LCUs
- **SSL/TLS:** AWS Certificate Manager (free)
- **Health Checks:** Enabled

### C. Bandwidth/Data Transfer
| Traffic Type | Estimated Monthly |
|--------------|-------------------|
| Inbound | 50-100 GB |
| Outbound | 100-200 GB |
| Inter-service | 50 GB |

**Total:** ~200-350 GB/month

---

## 5. ADDITIONAL AWS SERVICES

### A. CloudWatch
- **Logs:** 10-20 GB/month
- **Metrics:** Standard metrics for all services
- **Alarms:** 10-15 alarms (CPU, memory, disk, error rates)

### B. Route 53
- **Hosted Zone:** 1
- **DNS Queries:** ~1 million/month
- **Domain:** Your domain (if purchasing)

### C. AWS Secrets Manager
- **Secrets Stored:** 10-15 (API keys, DB credentials, SMTP)
- **Cost:** $0.40/secret/month

### D. CloudFront (Optional, for CDN)
- **Data Transfer:** 50-100 GB/month
- **Requests:** 500k-1M/month

### E. Systems Manager (SSM)
- **Parameter Store:** For configuration management
- **Session Manager:** For secure SSH access

---

## 6. SECURITY REQUIREMENTS

### A. Security Groups
| Name | Inbound Rules | Outbound Rules |
|------|--------------|----------------|
| ALB-SG | 80, 443 from 0.0.0.0/0 | All to App-SG |
| App-SG | 3000 from ALB-SG | All |
| MongoDB-SG | 27017 from App-SG | All |
| OpenSearch-SG | 9200, 443 from App-SG | All |

### B. IAM Roles & Policies
- EC2 instance role (S3, Secrets Manager, CloudWatch)
- Lambda execution role (if using serverless)
- Backup role

### C. SSL/TLS Certificates
- AWS Certificate Manager (free)
- For: `yourdomain.com`, `*.yourdomain.com`

---

## 7. BACKUP & DISASTER RECOVERY

### A. Backup Strategy
| Component | Frequency | Retention | Method |
|-----------|-----------|-----------|--------|
| MongoDB | Daily | 30 days | Atlas automated |
| OpenSearch | Daily snapshots | 30 days | AWS automated |
| EBS | Daily | 7 days | AWS Backup |
| Application Code | On commit | Indefinite | GitHub |

### B. AWS Backup Service
- **Cost:** ~$10-20/month for EBS snapshots

---

## 8. ESTIMATED MONTHLY COSTS (US-East-1)

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| **EC2 (App Server)** | t3.xlarge (24/7) | $120-150 |
| **MongoDB Atlas** | M10 cluster | $60-100 |
| **OpenSearch** | t3.medium.search x2 | $150-250 |
| **EBS Storage** | 130 GB gp3 | $10-15 |
| **S3 Storage** | 100 GB | $2-5 |
| **ALB** | Standard | $20-30 |
| **Data Transfer** | 300 GB | $20-30 |
| **CloudWatch** | Logs + Metrics | $10-20 |
| **Route 53** | 1 hosted zone | $0.50-1 |
| **Secrets Manager** | 10-15 secrets | $4-6 |
| **NAT Gateway** | 1 instance | $30-40 |
| **Backup** | Snapshots | $10-20 |

**TOTAL ESTIMATED COST:** **$440-670/month**

### Cost Optimization Options:
- Use Reserved Instances for EC2 (save 30-40%)
- Use Spot Instances for non-critical workloads
- Enable auto-scaling to reduce idle capacity
- Use S3 Intelligent-Tiering
- Implement proper CloudWatch log retention policies

---

## 9. DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│                   AWS Cloud                         │
│                                                     │
│  ┌──────────────┐         ┌──────────────┐        │
│  │ Route 53 DNS │────────▶│     ALB      │        │
│  └──────────────┘         └──────┬───────┘        │
│                                   │                 │
│         ┌─────────────────────────┴────┐           │
│         │                              │           │
│    ┌────▼─────┐                  ┌────▼─────┐     │
│    │ EC2 - AZ1│                  │ EC2 - AZ2│     │
│    │ Next.js  │                  │ Next.js  │     │
│    │ + Python │                  │ + Python │     │
│    └────┬─────┘                  └────┬─────┘     │
│         │                              │           │
│         └──────────┬───────────────────┘           │
│                    │                               │
│         ┌──────────┴────────────┐                  │
│         │                       │                  │
│    ┌────▼────────┐      ┌──────▼─────────┐        │
│    │  MongoDB    │      │  OpenSearch    │        │
│    │  Atlas M10  │      │  2-node cluster│        │
│    └─────────────┘      └────────────────┘        │
│                                                     │
│    ┌─────────────┐      ┌────────────────┐        │
│    │     S3      │      │  CloudWatch    │        │
│    │  (Storage)  │      │  (Monitoring)  │        │
│    └─────────────┘      └────────────────┘        │
└─────────────────────────────────────────────────────┘
```

---

## 10. SOFTWARE/APPLICATION REQUIREMENTS

### A. Runtime Environment
- **Node.js:** v18 or v20
- **Python:** 3.10 or 3.11
- **npm/yarn:** Latest stable
- **pip:** Latest stable

### B. Process Manager
- **PM2:** For Node.js process management
- **systemd:** For Python services

### C. Web Server (Optional)
- **Nginx:** Reverse proxy (if not using ALB directly)

---

## 11. ENVIRONMENT VARIABLES REQUIRED

```env
# Database
MONGODB_URI=mongodb+srv://...
OPENSEARCH_URL=https://...

# Authentication
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://yourdomain.com

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...

# APIs
OPENAI_API_KEY=...
HUGGINGFACE_API_KEY=...

# AWS (if using boto3)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## 12. DEPLOYMENT CHECKLIST

- [ ] Create VPC with public/private subnets
- [ ] Set up MongoDB Atlas cluster
- [ ] Deploy OpenSearch domain
- [ ] Launch EC2 instances with Auto Scaling
- [ ] Configure ALB with SSL
- [ ] Set up Route 53 DNS
- [ ] Configure Security Groups
- [ ] Create IAM roles and policies
- [ ] Store secrets in Secrets Manager
- [ ] Configure CloudWatch monitoring
- [ ] Set up S3 buckets
- [ ] Enable AWS Backup
- [ ] Deploy application code
- [ ] Configure environment variables
- [ ] Run database migrations
- [ ] Test all endpoints
- [ ] Enable auto-scaling policies
- [ ] Configure CloudWatch alarms
- [ ] Document runbook procedures

---

## 13. SCALING CONSIDERATIONS

### Vertical Scaling (Immediate)
- Upgrade EC2 to t3.2xlarge (8 vCPU, 32GB RAM)
- Upgrade MongoDB to M20 or M30
- Upgrade OpenSearch nodes to r6g.xlarge

### Horizontal Scaling (Growth)
- Add more EC2 instances behind ALB
- Increase OpenSearch cluster nodes
- Implement read replicas for MongoDB
- Use ElastiCache (Redis) for session/caching

---

## 14. SUPPORT & MAINTENANCE

### Monthly Maintenance Tasks
- Review CloudWatch logs and metrics
- Verify backups are successful
- Update security patches
- Review cost optimization opportunities
- Check SSL certificate renewal (auto via ACM)

### AWS Support Plan
- **Developer:** $29/month (business hours support)
- **Business:** $100/month (24/7 support, recommended)

---

## TOTAL INFRASTRUCTURE SUMMARY

| Category | Requirement |
|----------|-------------|
| **Compute** | 2x EC2 t3.xlarge instances |
| **Database** | MongoDB Atlas M10 + OpenSearch 2-node |
| **Storage** | 130GB EBS + 100GB S3 |
| **Network** | VPC, ALB, NAT Gateway, Route 53 |
| **Security** | 4 Security Groups, IAM roles, SSL certs |
| **Monitoring** | CloudWatch + AWS Backup |
| **Monthly Cost** | $440-670 (with optimization: $350-500) |

---

## CONTACT INFORMATION FOR CLOUD ANALYST

**Project Contact:** [Your Name]  
**Email:** [Your Email]  
**Timeline:** [Expected deployment date]  
**Budget:** $500-700/month  
**Region Preference:** US-East-1 (or specify)

---

## NOTES FOR CLOUD ANALYST

1. This is a production-ready cybersecurity intelligence platform
2. High availability (HA) is required for OpenSearch and MongoDB
3. SSL/TLS encryption required for all public endpoints
4. Consider using Reserved Instances for 1-year commitment (save 30-40%)
5. Implement auto-scaling for EC2 during peak usage
6. Use CloudFront CDN if serving global users
7. Backup retention: 30 days for databases, 7 days for EBS
8. Monitoring: Set up alarms for CPU >80%, Memory >85%, Disk >90%

---

**Document Version:** 1.0  
**Last Updated:** January 22, 2026  
**Prepared By:** AI Assistant (based on project analysis)

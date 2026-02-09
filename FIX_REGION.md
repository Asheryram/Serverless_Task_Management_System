# Quick Fix - Add Region Output

## The Issue

The scripts need to know which AWS region your resources are in. The User Pool exists but the script was using the wrong region.

## The Fix (2 steps)

### Step 1: Apply Terraform to add region output

```bash
cd terraform/environments/dev
terraform apply
# Type 'yes' when prompted
```

This adds the `aws_region` output so scripts can auto-detect the region.

### Step 2: Run create-admin again

```bash
cd ../../scripts
./create-admin.sh
```

Now it will work! The script will automatically use `eu-central-1` region.

---

## What Changed

**Added to `terraform/environments/dev/main.tf`:**
```hcl
output "aws_region" {
  value = var.aws_region
}
```

**Updated scripts:**
- ✅ `create-admin.sh` - Now uses correct region
- ✅ `get-token.sh` - Now uses correct region
- ✅ Both auto-fetch region from Terraform

---

## Verify It Works

After terraform apply:

```bash
# Check outputs
cd terraform/environments/dev
terraform output

# Should now show:
# aws_region = "eu-central-1"
# cognito_user_pool_id = "eu-central-1_xuH3Lw1BE"
# ...

# Run create-admin
cd ../../scripts
./create-admin.sh
```

Should work now! ✅

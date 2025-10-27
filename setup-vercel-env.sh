#!/bin/bash

# Script to upload environment variables to Vercel for all three environments
# Usage: ./setup-vercel-env.sh

echo "🚀 Setting up Vercel environment variables..."

# Function to add environment variable to Vercel
add_env_var() {
    local name=$1
    local value=$2
    local environment=$3
    local git_branch=$4

    if [ -n "$git_branch" ]; then
        echo "  Adding $name to $environment ($git_branch branch)..."
        echo -n "$value" | vercel env add "$name" "$environment" "$git_branch" --force > /dev/null 2>&1 || echo "    ⚠️  Warning: Failed to add $name"
    else
        echo "  Adding $name to $environment..."
        echo -n "$value" | vercel env add "$name" "$environment" --force > /dev/null 2>&1 || echo "    ⚠️  Warning: Failed to add $name"
    fi
}

# Function to process env file
process_env_file() {
    local env_file=$1
    local environment=$2
    local git_branch=$3

    echo ""
    echo "📝 Processing $env_file for $environment environment..."
    echo ""

    # Read the env file line by line
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip empty lines and comments
        if [[ -z "$line" ]] || [[ "$line" =~ ^#.*$ ]]; then
            continue
        fi

        # Extract variable name and value
        if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
            var_name="${BASH_REMATCH[1]}"
            var_value="${BASH_REMATCH[2]}"

            # Remove quotes if present
            var_value="${var_value%\"}"
            var_value="${var_value#\"}"

            add_env_var "$var_name" "$var_value" "$environment" "$git_branch"
        fi
    done < "$env_file"
}

echo "⚠️  Uploading environment variables to Vercel..."
echo "Project: donate-equity"
echo ""

# Process each environment
echo ""
echo "================================"
echo "1️⃣  PRODUCTION (main branch)"
echo "================================"
process_env_file ".env.production" "production" ""

echo ""
echo "================================"
echo "2️⃣  STAGING (staging branch)"
echo "================================"
process_env_file ".env.staging" "preview" "staging"

echo ""
echo "================================"
echo "3️⃣  DEVELOPMENT (develop branch)"
echo "================================"
process_env_file ".env.local" "preview" "develop"

echo ""
echo "✅ All environment variables have been uploaded to Vercel!"
echo "🔗 Visit https://vercel.com/bpnsolutions/donate-equity/settings/environment-variables to verify"

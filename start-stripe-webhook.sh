#!/bin/bash
# Script to start Stripe webhook forwarding

echo "🔄 Starting Stripe webhook forwarding..."
echo "📡 Forwarding to: http://localhost:3002/api/stripe/webhook"
echo ""
echo "⚠️  Keep this terminal window open while testing payments!"
echo ""
echo "After this starts, you'll see a webhook secret (whsec_...)"
echo "Copy that and update STRIPE_WEBHOOK_SECRET in your .env.local file"
echo ""
echo "Press Ctrl+C to stop"
echo ""

stripe listen --forward-to localhost:3002/api/stripe/webhook





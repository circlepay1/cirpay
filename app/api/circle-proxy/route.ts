import { NextRequest, NextResponse } from "next/server"

const ALLOWED = [
  "https://api.circle.com",
  "https://api-staging.circle.com",
  "https://iris-api.circle.com",
  "https://iris-api-sandbox.circle.com",
  "https://gateway-api.circle.com",
  "https://gateway-api-testnet.circle.com",
]

async function handle(req: NextRequest) {
  const target =
    req.headers.get("x-circle-target-url") ??
    `${req.nextUrl.searchParams.get("host")}${req.nextUrl.searchParams.get("path")}`

  if (!ALLOWED.some(h => target.startsWith(h))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const kitKey = process.env.KIT_KEY ?? process.env.NEXT_PUBLIC_KIT_KEY
  const body = req.method !== "GET" ? await req.text() : undefined

  const res = await fetch(target, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${kitKey}`,
      "Content-Type": req.headers.get("content-type") ?? "application/json",
    },
    body,
  })

  return new NextResponse(await res.text(), {
    status: res.status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
}

export const GET    = handle
export const POST   = handle
export const PUT    = handle
export const DELETE = handle
export const PATCH  = handle

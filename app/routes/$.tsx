import { Link } from "@remix-run/react"

export async function loader() {
    return Response.json(null, { status: 404 })
  }
  
  export default function Component() {
    return (
        <div className="min-h-screen">
        <Link to="/">Home</Link>
        <h1>Not Found</h1>
        </div>
    )
  }
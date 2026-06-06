export const handler = async (event) => {
  const { url } = event.queryStringParameters;
  
  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing url parameter" }),
    };
  }

  // Validate that the URL is for OzBargain to prevent open proxy abuse
  if (!url.startsWith("https://www.ozbargain.com.au") && !url.startsWith("https://files.ozbargain.com.au")) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: "Only OzBargain URLs are allowed" }),
    };
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const body = await response.text();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "text/plain",
        "Access-Control-Allow-Origin": "*",
      },
      body: body,
    };
  } catch (error) {
    console.error("Proxy error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch from OzBargain" }),
    };
  }
};

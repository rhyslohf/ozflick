export const handler = async (event) => {
  const { url } = event.queryStringParameters;
  
  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing url parameter" }),
    };
  }

  // Validate that the URL is for OzBargain (allow both http and https)
  const isOzBargain = 
    url.includes("ozbargain.com.au") || 
    url.startsWith("https://files.ozbargain.com.au");

  if (!isOzBargain) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: "Only OzBargain URLs are allowed" }),
    };
  }

  try {
    // Some OzBargain pages require a more complete set of headers to avoid Cloudflare/bot detection
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: `OzBargain returned status ${response.status}`,
          url: url 
        }),
      };
    }

    const body = await response.text();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
      body: body,
    };
  } catch (error) {
    console.error("Proxy error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to fetch from OzBargain: ${error.message}` }),
    };
  }
};

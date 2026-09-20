import {
  authenticatePlatformRequest,
  sendPlatformError,
  toPublicPlatformSession,
} from "../_shared/platform-auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  try {
    const authenticatedSession =
      await authenticatePlatformRequest(req);

    res.setHeader(
      "Cache-Control",
      "private, no-store, max-age=0"
    );

    res.setHeader(
      "Vary",
      "Authorization"
    );

    return res.status(200).json({
      session:
        toPublicPlatformSession(
          authenticatedSession
        ),
    });
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase/firebaseConfig";

const AUTH_WAIT_TIMEOUT_MS = 8000;

function waitForFirebaseUser() {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve, reject) => {
    let completed = false;
    let unsubscribe = null;

    const finish = (callback) => {
      if (completed) {
        return;
      }

      completed = true;

      clearTimeout(timeoutId);

      if (unsubscribe) {
        unsubscribe();
      }

      callback();
    };

    const timeoutId = setTimeout(() => {
      finish(() => {
        reject(
          new Error(
            "Firebase login session could not be restored. Please sign in again."
          )
        );
      });
    }, AUTH_WAIT_TIMEOUT_MS);

    unsubscribe = onAuthStateChanged(
      auth,

      (user) => {
        finish(() => {
          if (user) {
            resolve(user);
          } else {
            reject(
              new Error(
                "You must sign in before accessing the platform."
              )
            );
          }
        });
      },

      (error) => {
        finish(() => {
          reject(error);
        });
      }
    );
  });
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function getPlatformSession({
  forceRefresh = false,
} = {}) {
  const user = await waitForFirebaseUser();

  const token = await user.getIdToken(forceRefresh);

  const response = await fetch(
    "/api/platform/session",
    {
      method: "GET",

      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },

      cache: "no-store",
    }
  );

  const result = await readJsonResponse(response);

  if (!response.ok) {
    const error = new Error(
      result?.error ||
        `Platform session request failed (${response.status}).`
    );

    error.statusCode = response.status;

    throw error;
  }

  if (!result?.session) {
    throw new Error(
      "Platform session response was incomplete."
    );
  }

  return result.session;
}
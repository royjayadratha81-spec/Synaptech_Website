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
                "You must sign in before accessing Admissions."
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

function buildAdmissionsOverviewUrl(
  organizationId
) {
  const params = new URLSearchParams();

  if (
    typeof organizationId === "string" &&
    organizationId.trim()
  ) {
    params.set(
      "organization_id",
      organizationId.trim()
    );
  }

  const queryString = params.toString();

  return queryString
    ? `/api/admissions/overview?${queryString}`
    : "/api/admissions/overview";
}

export async function getAdmissionsOverview({
  organizationId = null,
  forceRefresh = false,
} = {}) {
  const user = await waitForFirebaseUser();

  const token =
    await user.getIdToken(forceRefresh);

  const response = await fetch(
    buildAdmissionsOverviewUrl(
      organizationId
    ),
    {
      method: "GET",

      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },

      cache: "no-store",
    }
  );

  const result =
    await readJsonResponse(response);

  if (!response.ok) {
    const error = new Error(
      result?.error ||
        `Admissions request failed (${response.status}).`
    );

    error.statusCode = response.status;

    throw error;
  }

  if (
    result?.read_only !== true ||
    !result?.organization ||
    !result?.summary ||
    !Array.isArray(result?.candidates) ||
    !Array.isArray(result?.applications)
  ) {
    throw new Error(
      "Admissions response was incomplete."
    );
  }

  return result;
}

export async function approveAdmissionsForFinance({
  applicationId,
  organizationId = null,
  decisionNote = null,
  forceRefresh = false,
} = {}) {
  const normalizedApplicationId =
    typeof applicationId === "string" ? applicationId.trim() : "";

  if (!normalizedApplicationId) {
    throw new Error(
      "Application ID is required for Admissions approval."
    );
  }

  const user = await waitForFirebaseUser();
  const token = await user.getIdToken(forceRefresh);
  const requestBody = {
    application_id: normalizedApplicationId,
  };

  if (typeof organizationId === "string" && organizationId.trim()) {
    requestBody.organization_id = organizationId.trim();
  }

  if (typeof decisionNote === "string" && decisionNote.trim()) {
    requestBody.decision_note = decisionNote.trim();
  }

  const response = await fetch(
    "/api/admissions/approve-for-finance",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    }
  );

  const result = await readJsonResponse(response);

  if (!response.ok) {
    const error = new Error(
      result?.error ||
        `Admissions approval request failed (${response.status}).`
    );
    error.statusCode = response.status;
    throw error;
  }

  if (
    result?.success !== true ||
    !result?.application?.id ||
    !result?.finance_queue?.account_id
  ) {
    throw new Error(
      "Admissions-to-Finance response was incomplete."
    );
  }

  return result;
}

export async function verifyAdmissionsFinance({
  organizationId = null,
  applicationId,
  clearanceType,
  amountReceived = 0,
  currency = "INR",
  paymentMethod = null,
  paymentReference = null,
  paymentDate = null,
  note = null,
  forceRefresh = false,
} = {}) {
  const user = await waitForFirebaseUser();

  const token =
    await user.getIdToken(forceRefresh);

  const response = await fetch(
    "/api/admissions/verify-finance",
    {
      method: "POST",

      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        organization_id: organizationId,
        application_id: applicationId,
        clearance_type: clearanceType,
        amount_received: amountReceived,
        currency,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        payment_date: paymentDate,
        note,
      }),

      cache: "no-store",
    }
  );

  const result =
    await readJsonResponse(response);

  if (!response.ok) {
    const error = new Error(
      result?.error ||
        `Finance verification request failed (${response.status}).`
    );

    error.statusCode = response.status;

    throw error;
  }

  if (
    result?.success !== true ||
    !result?.application?.id
  ) {
    throw new Error(
      "Finance verification response was incomplete."
    );
  }

  return result;
}
export async function approveAdmissionsApplication({
  applicationId,
  organizationId = null,
  decisionNote = null,
  forceRefresh = false,
} = {}) {
  const normalizedApplicationId =
    typeof applicationId === "string"
      ? applicationId.trim()
      : "";

  if (!normalizedApplicationId) {
    throw new Error(
      "Application ID is required for admission approval."
    );
  }

  const user = await waitForFirebaseUser();

  const token =
    await user.getIdToken(forceRefresh);

  const requestBody = {
    application_id: normalizedApplicationId,
  };

  if (
    typeof organizationId === "string" &&
    organizationId.trim()
  ) {
    requestBody.organization_id =
      organizationId.trim();
  }

  if (
    typeof decisionNote === "string" &&
    decisionNote.trim()
  ) {
    requestBody.decision_note =
      decisionNote.trim();
  }

  const response = await fetch(
    "/api/admissions/approve-application",
    {
      method: "POST",

      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify(requestBody),

      cache: "no-store",
    }
  );

  const result =
    await readJsonResponse(response);

  if (!response.ok) {
    const error = new Error(
      result?.error ||
        `Admission approval request failed (${response.status}).`
    );

    error.statusCode = response.status;

    throw error;
  }

  if (
    result?.success !== true ||
    !result?.application?.id
  ) {
    throw new Error(
      "Admission approval response was incomplete."
    );
  }

  return result;
}

async function admissionsRequest(path, {
  method = "GET",
  organizationId = null,
  body = null,
  forceRefresh = false,
} = {}) {
  const user = await waitForFirebaseUser();

  const token = await user.getIdToken(forceRefresh);
  const query = new URLSearchParams();
  if (organizationId) query.set("organization_id", organizationId);
  const response = await fetch(
    `/api/${path}${query.size ? `?${query.toString()}` : ""}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }
  );
  const result = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(result?.error || "Admissions request failed.");
  }

  return result;
}

export function getAdmissionsStudents({
  organizationId = null,
  forceRefresh = false,
} = {}) {
  return admissionsRequest("admissions/students", {
    organizationId,
    forceRefresh,
  });
}

export function createManualAdmission({
  organizationId = null,
  student,
  forceRefresh = false,
}) {
  return admissionsRequest("admissions/manual-intake", {
    method: "POST",
    forceRefresh,
    body: {
      ...student,
      ...(organizationId ? { organization_id: organizationId } : {}),
    },
  });
}

export function updateStudentLifecycle({
  organizationId = null,
  studentId,
  state,
  note = null,
  forceRefresh = false,
}) {
  return admissionsRequest("admissions/student-lifecycle", {
    method: "POST",
    forceRefresh,
    body: {
      student_id: studentId,
      state,
      note,
      ...(organizationId ? { organization_id: organizationId } : {}),
    },
  });
}

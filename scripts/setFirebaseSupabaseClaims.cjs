"use strict";

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

initializeApp();

async function setRoleCustomClaim() {
  let nextPageToken = undefined;
  let totalUpdated = 0;

  do {
    const result = await getAuth().listUsers(1000, nextPageToken);

    nextPageToken = result.pageToken;

    for (const user of result.users) {
      try {
        const existingClaims = user.customClaims || {};

        await getAuth().setCustomUserClaims(user.uid, {
          ...existingClaims,
          role: "authenticated",
        });

        console.log(`Updated: ${user.email || user.uid}`);
        totalUpdated++;
      } catch (error) {
        console.error(
          `Failed: ${user.email || user.uid}`,
          error.message
        );
      }
    }
  } while (nextPageToken);

  console.log(`\nCompleted. Users updated: ${totalUpdated}`);
}

setRoleCustomClaim()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Claim update failed:", error);
    process.exit(1);
  });
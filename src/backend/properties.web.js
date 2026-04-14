import wixData from "wix-data";
import wixUsersBackend from "wix-users-backend";

const COLLECTION = "Properties";

export async function getMyProperties({ limit = 100 } = {}) {
  try {
    const user = wixUsersBackend.currentUser;

    if (!user?.loggedIn) {
      return { ok: false, status: 401, items: [] };
    }

    const res = await wixData
      .query(COLLECTION)
      .eq("_owner", user.id)          // safest: use Wix _owner
      .descending("_createdDate")
      .limit(Math.min(limit, 1000))
      .find();

    // IMPORTANT: return the raw items (don’t map them and accidentally drop photos2)
    return { ok: true, status: 200, items: res.items || [] };
  } catch (e) {
    console.error("getMyProperties failed:", e);
    return { ok: false, status: 500, items: [] };
  }
}
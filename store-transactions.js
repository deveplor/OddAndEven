(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OAEStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function purchase(storage, username, item, earnedXp) {
    if (!/^[A-Z0-9_]{3,16}$/.test(username || '') || !item || !Number.isSafeInteger(item.price) || item.price < 0 || !Number.isFinite(earnedXp)) throw Error('This purchase could not be verified. Refresh the store.');
    const inventoryKey = 'oddandeven_store_inventory_' + username, spentKey = 'oddandeven_spent_xp_' + username;
    const oldInventory = storage.getItem(inventoryKey), oldSpent = storage.getItem(spentKey);
    const inventory = JSON.parse(oldInventory || '[]'), spent = Number(oldSpent || 0);
    if (!Array.isArray(inventory) || !Number.isSafeInteger(spent) || spent < 0) throw Error('Your saved wallet could not be read. No XP was spent.');
    if (inventory.includes(item.id)) return { alreadyOwned: true };
    if (Math.max(0, earnedXp - spent) < item.price) throw Error('Not enough XP. Your wallet may have changed in another tab.');
    try {
      storage.setItem(spentKey, String(spent + item.price));
      storage.setItem(inventoryKey, JSON.stringify([...inventory, item.id]));
    } catch (error) {
      if (oldSpent === null) storage.removeItem(spentKey); else storage.setItem(spentKey, oldSpent);
      if (oldInventory === null) storage.removeItem(inventoryKey); else storage.setItem(inventoryKey, oldInventory);
      throw Error('The purchase could not be saved. Free some browser storage and retry.');
    }
    return { alreadyOwned: false };
  }
  return { purchase };
});

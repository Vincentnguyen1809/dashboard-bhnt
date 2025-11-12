# 🔄 Dynamic Slug Routing System - Implementation Guide

## 🎯 Problem Solved

### Before (Broken):
```
Admin changes slug: giaidoan1 → giai-doan1
❌ URL /giai-doan1 loads but shows old data
❌ Sidebar still shows /giaidoan1 link
❌ Data fetching uses wrong ID
❌ Result: Broken UI, missing buttons, incomplete tasks
```

### After (Fixed):
```
Admin changes slug: giaidoan1 → giai-doan1
✅ Firestore detects change instantly
✅ Sidebar auto-updates to /giai-doan1
✅ Router resolves new slug correctly
✅ Data fetching uses correct menu ID
✅ Result: Everything works perfectly
```

---

## 📋 Architecture Overview

### 1. **Real-Time Menu Synchronization**

**File:** `index.html` (lines 5442-5481)

**Function:** `loadDynamicMenus()`

```javascript
async function loadDynamicMenus(){
  const menusRef = collection(db, 'projects', projectId, 'menus');

  // Real-time listener (not one-time fetch)
  onSnapshot(query(menusRef, orderBy('order')), snapshot => {
    dynamicMenus = [];
    snapshot.forEach(doc => {
      dynamicMenus.push({ id: doc.id, ...doc.data() });
    });

    // Auto-update UI when menus change
    renderDynamicMenus();
    renderSidebarDynamic();
    renderDynamicOverview();

    // Re-evaluate current route if slug changed
    if(router) router.handleCurrent();
  });
}
```

**What This Does:**
- ✅ Listens for changes to Firestore `menus` collection
- ✅ Updates `dynamicMenus` array in real-time
- ✅ Re-renders sidebar with new slugs
- ✅ Re-routes current page if slug changed

---

### 2. **Dynamic Sidebar Links**

**File:** `index.html` (lines 6063-6093)

**Function:** `renderSidebarDynamic()`

```javascript
function renderSidebarDynamic(){
  const nav = $('#main-navigation');

  let html = '<a class="nav-link" href="/tongquan">📊 Tổng Quan</a>';

  // Generate links from database
  dynamicMenus.forEach(menu => {
    if(menu.type === 'task-list'){
      const menuPath = menu.slug ? `/${menu.slug}` : `/dynamic-menu/${menu.id}`;
      html += `<a class="nav-link" href="${menuPath}">${menu.icon} ${menu.name}</a>`;
    }
  });

  nav.innerHTML = html;
}
```

**Key Points:**
- ✅ NO hardcoded paths
- ✅ Uses `menu.slug` from database
- ✅ Fallback to `/dynamic-menu/{id}` if no slug
- ✅ Auto-updates when menus change

---

### 3. **Dynamic Route Resolution**

**File:** `index.html` (lines 4405-4447)

**Function:** `createRouter().resolve()`

```javascript
function resolve(pathname){
  const normalized = normalizeRoutePath(pathname);

  // 1. Check static routes first
  if(config[normalized]){
    return { path: normalized, route: config[normalized] };
  }

  // 2. Check dynamic menus
  const pathWithoutSlash = normalized.slice(1); // Remove leading /
  const dynamicMenu = dynamicMenus.find(m =>
    m.type === 'task-list' &&
    (m.slug === pathWithoutSlash || `dynamic-menu/${m.id}` === pathWithoutSlash)
  );

  if(dynamicMenu){
    return {
      path: normalized,
      route: {
        layout: 'app',
        section: 'dynamic-menu',
        menuId: dynamicMenu.id,
        menuName: dynamicMenu.name
      }
    };
  }

  // 3. 404 - Route not found
  return { path: '/', route: defaultRoute, notFound: true };
}
```

**Resolution Order:**
1. Static routes (`/tongquan`, `/ghichu`, etc.)
2. Dynamic menu slugs (from database)
3. Fallback to home page (404)

---

### 4. **404 Error Handling**

**File:** `index.html` (lines 3925-3955)

**Function:** `showDynamicMenuSection()`

```javascript
function showDynamicMenuSection(menuId){
  const menu = dynamicMenus.find(m => m.id === menuId);

  if(!menu) {
    // Menu not found - show 404 page
    tasksContainer.innerHTML = `
      <div class="card-section text-center py-12">
        <div class="text-6xl mb-4">🔍</div>
        <h3>Không tìm thấy menu</h3>
        <p>Menu này có thể đã bị xóa hoặc URL không chính xác.</p>
        <a href="/tongquan">Về trang Tổng Quan</a>
      </div>
    `;
    return;
  }

  // Load menu content...
}
```

**User Experience:**
- ✅ User-friendly error message
- ✅ Link back to home page
- ✅ Console logs show available menus
- ✅ No broken UI or blank page

---

## 🔍 How It Works - Complete Flow

### Scenario: Admin Changes Slug

```
STEP 1: Admin Action
Admin Panel → Edit Menu → Change slug: "giaidoan1" → "giai-doan1" → Save

STEP 2: Firestore Update
Firestore menus collection updated

STEP 3: Real-Time Listener Triggers
onSnapshot() in loadDynamicMenus() detects change
Console: "📡 [MENU SYNC] Menus updated"

STEP 4: Data Sync
dynamicMenus array updated with new slug
Console: "slugs: ['giai-doan1', 'giaidoan2', ...]"

STEP 5: UI Re-Render
renderSidebarDynamic() called
Sidebar links updated to /giai-doan1

STEP 6: Route Re-Evaluation (if on that page)
router.handleCurrent() called
Router checks if current URL still valid

STEP 7: User Clicks Link
User clicks "Giai Đoạn 1" in sidebar
URL: /giai-doan1
Router resolves: ✅ Found dynamic menu
showDynamicMenuSection() loads correct tasks
```

---

## 📊 Database Structure

### Firestore Collection: `projects/{projectId}/menus`

```json
{
  "id": "auto-generated-id",
  "name": "Giai Đoạn 1",
  "slug": "giai-doan1",
  "icon": "📋",
  "type": "task-list",
  "order": 1,
  "createdAt": "2025-01-12T...",
  "updatedAt": "2025-01-12T..."
}
```

**Important Fields:**
- `slug` - URL path (e.g., "giai-doan1" → `/giai-doan1`)
- `type` - "task-list" or "external-link"
- `order` - Display order in sidebar
- `id` - Firestore document ID (used to fetch tasks)

---

## 🐛 Debugging

### Console Logs to Watch

**Menu Sync:**
```
📡 [MENU SYNC] Setting up real-time menu listener
📡 [MENU SYNC] Menus updated: {count: 4, slugs: [...], changed: true}
📡 [MENU SYNC] Re-evaluating current route: /giai-doan1
```

**Route Resolution:**
```
🔀 [ROUTER] Resolving path: /giai-doan1
🔍 [ROUTER] Checking dynamic menus for slug: giai-doan1
✅ [ROUTER] Found dynamic menu: {menuId: '...', slug: 'giai-doan1'}
```

**Menu Loading:**
```
📄 [MENU] Showing dynamic menu section for ID: xyz123
✅ [MENU] Loaded menu: Giai Đoạn 1
```

**Error Detection:**
```
❌ [MENU] Menu not found: xyz123
⚠️ [ROUTER] Route not found, redirecting to home: /invalid-slug
```

### Common Issues

**Issue 1: Sidebar shows old slug**
- Check console for "📡 [MENU SYNC] Menus updated"
- Verify `renderSidebarDynamic()` is being called
- Check `dynamicMenus` array in console

**Issue 2: URL works but shows 404**
- Check menu has correct `type: 'task-list'`
- Verify `slug` field exists in Firestore
- Check console for available slugs

**Issue 3: Changes don't reflect immediately**
- Firestore listener might not be set up
- Check for Firebase connection errors
- Look for "❌ [MENU SYNC] Error" in console

---

## ✅ Testing Checklist

### Test 1: Create New Menu
1. Admin → Create menu with slug "test-menu"
2. Check sidebar updates immediately
3. Click link → Should load menu
4. Check console: "✅ [ROUTER] Found dynamic menu"

### Test 2: Update Existing Slug
1. Admin → Edit menu → Change slug
2. Sidebar should update within 1 second
3. Old URL should redirect or show 404
4. New URL should work immediately

### Test 3: Delete Menu
1. Admin → Delete menu
2. Sidebar link should disappear
3. URL should show 404 error page
4. Console: "❌ [MENU] Menu not found"

### Test 4: External Links
1. Create menu with `type: 'external-link'`
2. Should NOT be in router's dynamic menus
3. Should open in new tab
4. Should have ↗ indicator

---

## 🔧 Configuration

### Static Routes (Never Dynamic)

These routes are **always** static in `routeConfig`:

```javascript
const routeConfig = {
  '/': { layout: 'cover' },        // Cover page
  '/login': { layout: 'login' },   // Login page
  '/tongquan': { layout: 'app' },  // Overview
  '/ghichu': { layout: 'app' },    // Notes
  '/quan-ly-nguoi-dung': { ... },  // Admin: User mgmt
  '/quan-ly-ke-hoach': { ... },    // Admin: Plan mgmt
  '/cai-dat': { layout: 'app' },   // Settings
};
```

**DO NOT add phase routes here!** They are handled dynamically.

### Dynamic Routes (From Database)

All menu routes with `type: 'task-list'` are dynamic:
- Use `menu.slug` field for URL
- Resolved by router's `resolve()` function
- Auto-update when slug changes

---

## 🚀 Best Practices

### 1. Slug Naming
✅ **Good:** `giai-doan-1`, `marketing-plan`, `q1-tasks`
❌ **Bad:** `GiaiDoan1`, `Marketing Plan`, `Q1/Tasks`

### 2. Menu Types
- `task-list` - Internal page with tasks
- `external-link` - Opens external URL

### 3. Error Handling
- Always check if menu exists before rendering
- Show user-friendly 404 pages
- Log errors to console for debugging

### 4. Performance
- Real-time listeners are efficient (only fires on changes)
- Sidebar re-render is fast (simple HTML injection)
- Router re-evaluation only happens when needed

---

## 📚 Related Files

| File | Lines | Function |
|------|-------|----------|
| `index.html` | 5442-5481 | `loadDynamicMenus()` - Real-time sync |
| `index.html` | 6063-6093 | `renderSidebarDynamic()` - Sidebar links |
| `index.html` | 4405-4447 | `createRouter().resolve()` - Route matching |
| `index.html` | 3925-3955 | `showDynamicMenuSection()` - Menu display |
| `index.html` | 3889-3900 | `routeConfig` - Static routes |

---

## 🎉 Summary

### What Changed
- ❌ Removed hardcoded phase routes
- ✅ Added real-time menu listener
- ✅ Enhanced router with dynamic resolution
- ✅ Added 404 error handling
- ✅ Added comprehensive logging

### Benefits
- ✅ Slugs update instantly when changed in admin
- ✅ No page refresh needed
- ✅ Sidebar always shows correct links
- ✅ Router always resolves correct menu
- ✅ User-friendly error messages
- ✅ Easy to debug with console logs

### Migration Notes
- Old URLs (e.g., `/giaidoan1`) will redirect to home
- Admin should update bookmarks to new slugs
- No database migration needed
- Works with existing Firestore data

---

**✨ The system is now fully dynamic and slug-change-safe!**

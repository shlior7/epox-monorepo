# Design Log #006: Use Cases & Scenarios

**Status**: Draft
**Created**: 2026-01-10
**Author**: Claude
**Related**: Design Log #001 (Architecture), Design Log #002 (Authentication), Design Log #003 (Data Model), Design Log #004 (User Flows), Design Log #005 (Screens & UI)

---

## Background

The `visualizer-client` platform serves non-technical users who need to generate AI-powered product visualizations at scale. To ensure the system meets real-world needs, we need detailed use case documentation that covers:

- **Primary workflows** - Core functionality that 80% of users will perform regularly
- **Secondary workflows** - Supporting features and occasional tasks
- **Edge cases** - Error conditions, limits, and exceptional scenarios
- **User personas** - Different user types with varying needs and expertise levels

This design log provides a comprehensive catalog of use cases with realistic scenarios, step-by-step flows, and success criteria.

---

## Problem

We need to document:
1. **Complete use case coverage** - Every user action from onboarding to image management
2. **Realistic scenarios** - Concrete examples with specific products, quantities, and outcomes
3. **Error handling** - How the system responds to failures at every step
4. **Success metrics** - Measurable criteria to validate each use case works correctly
5. **Component mapping** - Which screens, APIs, and components support each use case

Without this documentation:
- Developers won't know all the scenarios to test
- Designers will miss edge cases in their mockups
- Product decisions will lack user-centered context
- QA won't have comprehensive test scenarios

---

## Questions and Answers

### Q1: Should we document happy path only or include all edge cases?
**A**: Both, with clear separation:
- **Main flow** - Happy path with no errors
- **Alternative flows** - Valid variations (e.g., skip inspiration step)
- **Exception flows** - Error conditions and recovery

### Q2: How detailed should quantifiable outcomes be?
**A**: Specific and realistic:
- ✅ "Generate 45 images in 12 minutes"
- ❌ "Generate some images quickly"
- Include ranges: "20-500 products per studioSession"
- Show quota usage: "45 of 100 monthly generations used"

### Q3: Should we include future features (team collaboration, API)?
**A**: Yes, but marked clearly:
- Mark as **[Future]** in use case title
- Describe intended behavior
- Note dependencies and timeline
- Helps with architecture planning

### Q4: How do we handle concurrent user scenarios?
**A**: Document explicitly:
- Single user, single session (most common)
- Single user, multiple tabs (auto-save conflicts)
- Multiple users, same client (future team collaboration)

### Q5: Should personas be generic or based on real customer profiles?
**A**: Mix of both:
- 3 primary personas based on common use cases
- Include job titles, goals, pain points, technical skill level
- Use realistic product examples (furniture, fixtures, decor)

---

## Design

### User Personas

#### Persona 1: Sarah Chen - Furniture Brand Marketing Manager

**Background**:
- Age: 32
- Company: Modern Living Co. (mid-size furniture brand, 200+ SKUs)
- Role: Marketing Manager
- Technical skill: Medium (comfortable with SaaS tools, not a developer)

**Goals**:
- Generate seasonal product catalogs (4x per year, 50-100 products each)
- Create social media images for new product launches
- Maintain consistent brand aesthetic across all visuals
- Reduce dependency on expensive photoshoots

**Pain Points**:
- Current process: 3-week photoshoot + 2-week editing = slow
- High cost: $500-1000 per product for professional photography
- Limited scene variety (same studio setup)
- Difficult to visualize products in different room styles

**Use Case Focus**:
- Bulk generation (50-100 products)
- Brand consistency (reuse pinned inspiration)
- Download organization (by studioSession, by product)
- Regeneration for A/B testing different styles

---

#### Persona 2: Mike Rodriguez - E-commerce Catalog Manager

**Background**:
- Age: 28
- Company: HomePlus Marketplace (large online retailer, 1000+ SKUs)
- Role: Catalog Operations Manager
- Technical skill: High (manages CSV imports, API integrations)

**Goals**:
- Update entire catalog with new visuals quarterly
- Process large batches (200-500 products at once)
- Integrate with existing product database
- Track quota usage and costs

**Pain Points**:
- Managing 1000+ products manually is overwhelming
- Existing images inconsistent (from multiple vendors)
- Need to filter/search products efficiently
- Quota limits constrain large batches

**Use Case Focus**:
- Large dataset handling (500+ products)
- Product catalog management (CSV import, bulk edits)
- Filtering and search (by category, room type, SKU)
- Quota monitoring and limits

---

#### Persona 3: Alex Thompson - Interior Design Studio Owner

**Background**:
- Age: 45
- Company: Thompson Interiors (small studio, curated product line of 30-50 SKUs)
- Role: Owner / Lead Designer
- Technical skill: Low (prefers simple, guided workflows)

**Goals**:
- Showcase products in aspirational room settings
- Create mood boards for client presentations
- Experiment with different design styles
- High-quality, artistic results

**Pain Points**:
- Limited technical knowledge (needs simple UX)
- Small product catalog but high quality standards
- Wants creative control over aesthetics
- Budget-conscious (needs free/starter tier)

**Use Case Focus**:
- Small studioSessions (10-30 products)
- High customization (manual inspiration selection)
- Quality over quantity (regenerate until perfect)
- Settings management (save preferred styles)

---

## Primary Use Cases

### UC-001: New User Onboarding

**Actor**: New user (any persona)

**Preconditions**:
- Admin has created client account
- Admin has invited user via email
- User has received invitation email (not expired)

**Main Flow**:

1. **User receives invitation email**
   - Email contains invitation link with token
   - Token valid for 7 days
   - Email shows client name and inviter name

2. **User clicks invitation link**
   - Browser opens `/signup?token={invitationToken}`
   - System validates token (checks expiration, signature)
   - Email pre-filled from token

3. **User fills signup form**
   - Name: "Sarah Chen"
   - Password: Creates secure password (min 8 chars)
   - Accepts terms of service

4. **System creates account**
   - Creates user record in `users` table
   - Updates member status: `invited` → `active`
   - Sets `joinedAt` timestamp
   - Creates session with `clientId`

5. **User lands on dashboard**
   - Shows empty state with "Create First StudioSession" CTA
   - Displays product count for client
   - Optional: Shows onboarding tutorial video

6. **User creates first studioSession**
   - Follows UC-002 (Creating a StudioSession)
   - Smart defaults applied (auto-select all if <20 products)

**Alternative Flows**:

**A1: Token expired**
- System shows: "Invitation expired. Contact your administrator for a new invitation."
- User cannot proceed
- Admin must send new invitation

**A2: Email already registered**
- System shows: "Account already exists. Try logging in instead."
- Provides link to login page
- User can reset password if needed

**A3: User skips first studioSession**
- Clicks "Skip" or navigates away
- Dashboard shows empty state persistently
- Can create studioSession later from dashboard or nav

**Exception Handling**:

- **Network error during signup**: Show retry button, don't lose form data
- **Database error**: Show generic error, log to monitoring, email admin
- **Session creation fails**: Show error, allow retry, log issue

**Postconditions**:
- User account created and active
- User logged in with valid session
- User associated with exactly one client
- Ready to create first studioSession

**Success Criteria**:
- ✅ User can sign up in <2 minutes
- ✅ Form validation prevents invalid data
- ✅ Session persists for 7 days
- ✅ User sees personalized dashboard
- ✅ Clear next step (create studioSession)

**Related Components**:
- `/signup` page (Design Log #005, Screen 1)
- `SignupForm` component
- `/api/auth/signup` route
- `members` table (Design Log #003)
- Dashboard empty state (Design Log #005, Screen 2)

**Scenario Example**:

> Sarah receives an invitation from her admin John. She clicks the link, creates her account with password "SecurePass123", and lands on the dashboard. She sees "Welcome, Sarah! You have 127 products ready to visualize." She clicks "Create First StudioSession" and selects 45 furniture products for her summer catalog.

---

### UC-002: Creating a StudioSession (Bulk Generation)

**Actor**: Logged-in user (Sarah - bulk generation, 45 products)

**Preconditions**:
- User authenticated with active session
- Client has at least 1 product in catalog
- User has not exceeded monthly generation quota

**Main Flow**:

**Step 1: Select Products (2 minutes)**

1. User clicks "+ New StudioSession" from dashboard
2. System navigates to `/studioSessions/new?step=1`
3. System loads products from database (paginated, 50 per page)
4. User applies filters:
   - Category: "Furniture"
   - Room Type: "Living Room, Bedroom"
5. System filters products, shows 68 results
6. User selects products:
   - Clicks checkboxes for 45 products
   - Uses "Select All Filtered" button (selects all 68)
   - Deselects 23 products manually
7. System shows "45 products selected"
8. User clicks "Next: Analyze"
9. System creates draft studioSession record:
   ```typescript
   {
     id: "col_abc123",
     clientId: "client_xyz",
     name: "Summer Catalog 2026",
     status: "draft",
     selectedProductIds: ["prod_1", "prod_2", ..., "prod_45"],
     createdAt: "2026-01-10T14:00:00Z"
   }
   ```

**Step 2: AI Analysis (30 seconds)**

10. System navigates to `/studioSessions/new?step=2`
11. System auto-triggers product analysis:
    - POST `/api/studioSessions/{id}/analyze`
    - Analyzes product metadata (category, room types, names)
    - Uses Gemini to extract patterns
12. System shows loading state (progress bar)
13. AI returns analysis after 30 seconds:
    ```typescript
    {
      roomTypeDistribution: {
        "Living Room": 18,
        "Bedroom": 15,
        "Dining Room": 8,
        "Office": 4
      },
      productTypes: ["Sofa", "Chair", "Bed", "Table", "Desk"],
      suggestedStyles: ["Modern", "Contemporary", "Scandinavian"],
      recommendedInspirationKeywords: [
        "modern living room",
        "contemporary bedroom",
        "scandinavian dining"
      ]
    }
    ```
14. System displays analysis results
15. User reviews results, clicks "Next: Inspire"

**Step 3: Choose Inspirations (3 minutes)**

16. System navigates to `/studioSessions/new?step=3`
17. User sees 3 tabs: Upload, Unsplash, My Library
18. User selects Unsplash tab
19. System pre-populates search with "modern living room" (from analysis)
20. System fetches Unsplash results (via `/api/unsplash/search`)
21. User browses 20 images, selects 3:
    - "Modern Living Room with Natural Light"
    - "Contemporary Bedroom Minimal"
    - "Scandinavian Dining Room"
22. System shows selected images in preview panel (3 of 5)
23. User clicks "Next: Generate"

**Step 4: Review & Generate (1 minute)**

24. System navigates to `/studioSessions/new?step=4`
25. System displays summary:
    - Products: 45
    - Inspirations: 3
    - Estimated images: 180 (45 products × 4 variants)
    - Estimated time: ~15 minutes
26. System shows advanced settings (collapsed):
    - Aspect ratio: 1:1
    - Variety level: 5
    - Match product colors: Yes
27. User reviews settings, clicks "Generate StudioSession"
28. System processes generation request:
    - Analyzes inspiration images (extracts style, lighting, colors)
    - Builds base settings from inspiration analysis
    - Creates 180 GeneratedImage records (45 products × 4 variants)
    - Enqueues 180 jobs in Redis generation queue
    - Updates studioSession status: `draft` → `generating`
29. System navigates to `/studioSessions/{id}/results`
30. System shows generation progress:
    - "Generating 180 images... 0 of 180 completed (0%)"
    - Progress bar updating every 5 seconds
31. Background workers process queue:
    - Generate images via Gemini API
    - Upload to R2
    - Update GeneratedImage records
    - Update studioSession progress
32. After 12 minutes, all images complete
33. System shows completion notification
34. User views results gallery (UC-006)

**Alternative Flows**:

**A1: User selects <10 products**
- System shows warning: "Small batch. Consider selecting more products for better efficiency."
- User can proceed or go back to select more

**A2: User selects >500 products**
- System shows error: "Maximum 500 products per studioSession. Please reduce selection."
- "Continue" button disabled until count ≤500

**A3: User skips inspiration images (0 selected)**
- System shows confirmation: "No inspirations selected. We'll use default settings. Continue?"
- User confirms
- System uses generic modern style defaults

**A4: AI analysis fails**
- System shows error: "AI analysis unavailable. Using basic analysis from product metadata."
- Fallback: Analyze room types from product metadata only
- User can still proceed with generic suggestions

**A5: User abandons wizard mid-flow**
- System auto-saves draft every 30 seconds
- User can return to `/studioSessions/{id}/edit` later
- Draft shows on dashboard with "Resume" button
- Drafts older than 7 days auto-deleted

**Exception Handling**:

- **Network failure during step navigation**: Auto-retry with exponential backoff, show "Connection lost" banner
- **Product loading fails**: Show error state with retry button, don't lose selections
- **Gemini API timeout**: Use fallback metadata analysis, log error, notify user
- **Unsplash API rate limit**: Show cached popular images instead, notify user
- **Generation queue full**: Show error "System busy, try again in 5 minutes", auto-retry
- **R2 upload fails**: Retry up to 3 times, mark image as error if all fail
- **User quota exceeded**: Show quota modal before generation, prevent proceeding

**Postconditions**:
- StudioSession created with status `generating` or `completed`
- 180 GeneratedImage records created
- 180 images uploaded to R2 (on success)
- StudioSession visible in studioSessions list
- User quota updated (180 generations deducted)

**Success Criteria**:
- ✅ Complete workflow in <7 minutes (excluding generation time)
- ✅ Auto-save prevents data loss if abandoned
- ✅ Progress updates visible every 5 seconds
- ✅ 95%+ of generations complete successfully
- ✅ User notified on completion (browser notification + email)
- ✅ Generated images match inspiration style

**Related Components**:
- StudioSession wizard (Design Log #005, Screen 4)
- Product selection table (Design Log #005, Step 1)
- Analysis results (Design Log #005, Step 2)
- Inspiration picker (Design Log #005, Step 3)
- Generation progress (Design Log #005, Step 4)
- APIs: `/api/studioSessions`, `/api/products`, `/api/analyze`, `/api/generate`

**Quantifiable Outcomes**:
- **Time**: 7 minutes user interaction + 12 minutes background generation = 19 minutes total
- **Cost**: 180 generations × $0.05 = $9.00 (hypothetical pricing)
- **Quota**: 180 of 100 monthly limit used (triggers upgrade prompt)
- **Success rate**: 176/180 completed, 4 errors (98% success)
- **Storage**: 180 images × 2MB avg = 360MB

**Scenario Example**:

> Sarah needs to generate images for her summer catalog. She selects 45 furniture products (sofas, beds, tables) filtered by "Living Room" and "Bedroom". The AI analyzes her selection and suggests "Modern" and "Contemporary" styles. She picks 3 inspiration images from Unsplash showing bright, minimalist rooms. She clicks "Generate" and gets 180 product visualizations in 12 minutes. She downloads all images as a ZIP file for her marketing team.

---

### UC-003: Analyzing Products with AI

**Actor**: Logged-in user (during studioSession creation or standalone)

**Preconditions**:
- User has selected 1+ products
- Gemini API is available and has quota
- Products have metadata (name, category, room type)

**Main Flow**:

1. User completes Step 1 of wizard (45 products selected)
2. User clicks "Next: Analyze"
3. System navigates to `/studioSessions/new?step=2`
4. System automatically triggers analysis:
   - POST `/api/studioSessions/{id}/analyze`
   - Request body: `{ productIds: ["prod_1", ..., "prod_45"] }`
5. System shows loading state:
   - Spinner with message: "AI is analyzing your products..."
   - Progress bar (simulated, 0% → 100% over 30s)
   - Status messages: "Understanding product types", "Detecting room contexts"
6. Backend processes analysis:
   ```typescript
   // Collect product metadata
   const products = await db.products.findMany({
     where: { id: { in: productIds } }
   });

   // Analyze with AI
   const prompt = `
     Analyze these ${products.length} products:
     ${products.map(p => `${p.name} (${p.category}, ${p.roomTypes.join(', ')})`).join('\n')}

     Provide:
     1. Room type distribution (count per room)
     2. Product types detected
     3. Suggested design styles (max 3)
     4. Recommended Unsplash keywords for inspiration
   `;

   const analysis = await gemini.analyze(prompt);
   ```
7. AI returns analysis after 30 seconds
8. System stores analysis in studioSession:
   ```typescript
   await db.studioSessions.update({
     where: { id: studioSessionId },
     data: {
       productAnalysis: analysis,
       status: "analyzing"
     }
   });
   ```
9. System displays results:
   - Room type distribution chart (horizontal bars)
   - Product types list
   - Suggested styles chips
   - Recommended keywords for next step
10. User reviews analysis, proceeds to next step

**Alternative Flows**:

**A1: Analysis completes quickly (<10 seconds)**
- Skip loading animation
- Show results immediately
- Same outcome

**A2: User has only metadata (no product images)**
- Analysis based solely on text metadata
- Warning shown: "No product images found. Analysis may be less accurate."
- Suggestions more generic

**A3: Products have conflicting room types**
- AI detects mixed categories (e.g., Office + Kitchen + Bedroom)
- Analysis shows all room types
- Warning: "Mixed room types detected. Consider splitting into multiple studioSessions."
- User can proceed or go back

**Exception Handling**:

- **Gemini API timeout (>60s)**: Fallback to metadata-only analysis, show warning
- **Gemini API rate limit**: Retry after 10s, show "AI service busy" message
- **Gemini API error (500)**: Use fallback analysis logic:
  ```typescript
  // Fallback: Simple metadata aggregation
  const fallbackAnalysis = {
    roomTypeDistribution: aggregateRoomTypes(products),
    productTypes: extractCategories(products),
    suggestedStyles: ["Modern"], // Generic default
    recommendedInspirationKeywords: generateKeywordsFromMetadata(products)
  };
  ```
- **Network disconnection**: Auto-retry up to 3 times, show offline banner
- **Invalid product data**: Skip invalid products, analyze remaining, log warning

**Postconditions**:
- StudioSession has `productAnalysis` field populated
- Analysis results displayed to user
- Suggested keywords ready for Unsplash search (next step)
- StudioSession status: `draft` → `analyzing` → `ready`

**Success Criteria**:
- ✅ Analysis completes in <60 seconds for 100 products
- ✅ Fallback works if AI unavailable
- ✅ Suggestions are relevant (manual QA spot-check)
- ✅ Room type distribution accurate (matches product metadata)
- ✅ No duplicate or nonsensical suggestions

**Related Components**:
- Analysis results screen (Design Log #005, Step 2)
- `/api/studioSessions/{id}/analyze` endpoint
- `ProductAnalyzer` service (Design Log #001, shared package)
- `productAnalysis` field in studioSessions table (Design Log #003)

**Quantifiable Outcomes**:
- **Time**: 30 seconds for 45 products = 0.67s per product
- **Tokens**: ~1000 input tokens + 500 output tokens = $0.02 (Gemini pricing)
- **Accuracy**: 90% room type match vs. manual categorization (based on testing)

**Scenario Example**:

> Sarah's 45 furniture products are analyzed by AI. The system detects 18 Living Room items, 15 Bedroom items, 8 Dining Room items, and 4 Office items. It suggests "Modern", "Contemporary", and "Scandinavian" styles. These suggestions help Sarah find relevant inspiration images in the next step.

---

### UC-004: Selecting Inspiration Images

**Actor**: Logged-in user

**Preconditions**:
- User is on Step 3 of wizard
- Analysis completed (suggested keywords available)
- At least one inspiration source is accessible (Upload, Unsplash, or Library)

**Main Flow**:

1. User navigates to Step 3 (Inspire)
2. System displays 3 tabs: Upload, Unsplash, My Library
3. System pre-selects Unsplash tab (most common)
4. System auto-populates search with first suggested keyword: "modern living room"
5. System fetches Unsplash results:
   - GET `/api/unsplash/search?q=modern+living+room&page=1`
   - Returns 20 results
6. User browses images in 4-column grid
7. User clicks image to select
8. System adds to selected images panel (1 of 5)
9. User searches for second keyword: "contemporary bedroom"
10. System fetches new results
11. User selects 2 more images (3 of 5)
12. User switches to Upload tab
13. User drags and drops 1 image from desktop
14. System uploads image:
    - POST `/api/upload` with FormData
    - Validates: JPG/PNG, <10MB
    - Uploads to R2: `s3://bucket/clients/{clientId}/inspirations/{id}.jpg`
    - Returns URL
15. System adds uploaded image to selected panel (4 of 5)
16. User reviews selection:
    - 3 from Unsplash
    - 1 from Upload
    - Total: 4 of 5
17. User clicks "Next: Generate"
18. System saves inspiration images:
    ```typescript
    await db.inspirationImages.createMany({
      data: [
        {
          studioSessionId,
          imageId: "img_1",
          source: "unsplash",
          displayOrder: 0
        },
        {
          studioSessionId,
          imageId: "img_2",
          source: "upload",
          displayOrder: 1
        },
        // ...
      ]
    });
    ```

**Alternative Flows**:

**A1: User selects 0 images (skip inspiration)**
- System shows confirmation: "No inspirations selected. Use default settings?"
- User confirms
- System proceeds with generic modern style
- Base settings use defaults instead of inspiration-derived values

**A2: User selects only from Library (pinned previous generations)**
- User switches to Library tab
- System loads pinned images: `GET /api/generated-images?pinned=true&clientId={id}`
- User filters by room: "Living Room"
- System shows 5 pinned images
- User selects 2
- Same outcome as Unsplash selection

**A3: User hits 5-image limit**
- User tries to select 6th image
- System shows toast: "Maximum 5 inspiration images. Remove one to add more."
- Select button disabled
- User must remove an image to select another

**A4: User removes and re-adds images**
- User clicks Remove on selected image
- System removes from selection (3 of 5)
- User can select different image
- Order preserved by displayOrder field

**Exception Handling**:

- **Unsplash API down**: Show error "Image search unavailable", suggest Upload or Library tabs
- **Unsplash rate limit**: Show cached popular results, notify user
- **Upload fails (network)**: Show progress bar, retry automatically, show error if all retries fail
- **Invalid file format**: Show inline error "Only JPG and PNG supported", prevent upload
- **File too large (>10MB)**: Show error "File must be under 10MB", suggest compression
- **R2 upload fails**: Retry 3 times, show error "Upload failed. Try again.", log to monitoring
- **Library empty (no pinned images)**: Show empty state "Pin your favorite generated images to reuse them"

**Postconditions**:
- StudioSession has 0-5 inspiration images linked
- Each inspiration stored in `inspiration_images` table
- Upload images saved to R2
- Ready to proceed to generation step

**Success Criteria**:
- ✅ User can select from all 3 sources
- ✅ Unsplash search returns relevant results
- ✅ Upload completes in <10 seconds for 5MB file
- ✅ 5-image limit enforced
- ✅ Selection preserved if user goes back to previous step
- ✅ Unsplash attribution included (legal requirement)

**Related Components**:
- Inspiration picker (Design Log #005, Step 3)
- Upload tab with drag-drop
- Unsplash tab with search
- Library tab with pinned images
- `/api/upload`, `/api/unsplash/search`, `/api/generated-images`
- `inspiration_images` table (Design Log #003)

**Quantifiable Outcomes**:
- **Selection time**: 3 minutes for 4 images
- **Uploads**: 1 image × 3MB = 3MB storage used
- **API calls**: 2 Unsplash searches = 40 results fetched
- **Unsplash attribution**: Must display photographer credit

**Scenario Example**:

> Sarah searches Unsplash for "modern living room" and selects 3 images showing bright, minimalist spaces. She uploads 1 custom brand photo from a previous photoshoot. With 4 inspiration images selected, the AI will analyze their common attributes (natural lighting, neutral tones, minimal props) and use these to generate consistent product visualizations.

---

### UC-005: Monitoring Generation Progress

**Actor**: Logged-in user (waiting for studioSession to complete)

**Preconditions**:
- StudioSession has status `generating`
- At least 1 GeneratedImage has status `pending` or `generating`
- User is on results page or has page open in background

**Main Flow**:

1. User is on `/studioSessions/{id}/results` (navigated after clicking "Generate")
2. System loads initial state:
   ```typescript
   const studioSession = await db.studioSessions.findById(id);
   const images = await db.generatedImages.findMany({
     where: { studioSessionId: id }
   });

   const progress = {
     total: 180,
     completed: 0,
     pending: 180,
     generating: 0,
     error: 0
   };
   ```
3. System displays progress UI:
   - Progress bar: 0%
   - Status: "Generating 180 images... 0 of 180 completed"
   - Estimated time: "~15 minutes"
4. System starts polling for updates:
   ```typescript
   const { data } = useQuery({
     queryKey: ['studioSession-progress', id],
     queryFn: () => fetchStudioSessionProgress(id),
     refetchInterval: 5000, // Poll every 5 seconds
     refetchIntervalInBackground: true // Continue when tab inactive
   });
   ```
5. Background workers process queue:
   - Worker picks job from Redis: `LPOP client:generation:queue`
   - Worker generates image via Gemini (20-40 seconds)
   - Worker uploads to R2
   - Worker updates database:
     ```typescript
     await db.generatedImages.update({
       where: { id: imageId },
       data: {
         status: 'completed',
         imageId: uploadedImageId,
         progress: 100,
         completedAt: new Date()
       }
     });
     ```
6. System polls and gets update (after 5 seconds):
   - Completed: 3, Pending: 177, Generating: 0
   - Progress: 1.7%
7. System updates UI:
   - Progress bar animates to 1.7%
   - Status: "3 of 180 completed"
   - Recent completions list updates:
     - ✓ Modern Desk - Living Room
     - ✓ Velvet Sofa - Living Room
     - ✓ King Bed - Bedroom
8. User sees first completed images appear in gallery below progress bar
9. User can click image to view full-size
10. Process continues for 12 minutes
11. After 12 minutes, system detects 100% completion:
    - Completed: 176, Error: 4, Total: 180
    - Progress: 97.8% (some errors)
12. System shows completion notification:
    - Browser notification: "StudioSession 'Summer Catalog 2026' complete! 176 of 180 images generated."
    - Email notification sent (if enabled in settings)
13. System updates studioSession status: `generating` → `completed`
14. Progress bar shows green checkmark
15. User can now download all images

**Alternative Flows**:

**A1: User navigates away during generation**
- Polling continues in background
- Browser notification sent when complete
- User can return to results page anytime
- Progress preserved

**A2: User closes browser during generation**
- Generation continues on server (queue-based, not session-dependent)
- Email sent when complete
- User logs back in later, sees completed studioSession

**A3: User has multiple studioSessions generating simultaneously**
- Each studioSession polls independently
- Dashboard shows status of all active studioSessions
- No interference between studioSessions

**A4: All images complete successfully (no errors)**
- Progress reaches 100%
- Status: "All 180 images generated!"
- No error summary shown
- Green success banner

**Exception Handling**:

- **Polling fails (network error)**: Auto-retry after 10 seconds, show "Connection lost" banner
- **Some images fail to generate**:
  - Show error count: "176 of 180 completed, 4 failed"
  - List failed products: "Bathroom Vanity (AI error)", "Office Chair (timeout)"
  - Offer "Retry Failed" button
- **All images fail**: Show error modal "Generation failed. Please try again or contact support."
- **Generation stuck (no progress for 5 minutes)**:
  - Show warning "Generation may be delayed. Check status or contact support."
  - Offer "Cancel Generation" button
- **User quota exceeded mid-generation**:
  - Pause generation at quota limit
  - Show upgrade modal
  - Completed images remain accessible

**Postconditions**:
- StudioSession status: `generating` → `completed`
- 176+ GeneratedImages have status `completed` with imageId
- 0-4 GeneratedImages have status `error` with errorMessage
- Images uploaded to R2 and accessible
- User notified of completion

**Success Criteria**:
- ✅ Progress updates visible within 5 seconds
- ✅ UI responsive during polling (no freezing)
- ✅ Browser notification works when tab inactive
- ✅ Email notification sent (if enabled)
- ✅ Error summary accurate and actionable
- ✅ 95%+ success rate for generations

**Related Components**:
- Results gallery (Design Log #005, Screen 5)
- Generation progress component (Design Log #005, Step 4)
- `/api/studioSessions/{id}/status` endpoint
- GenerationQueue service (Design Log #001)
- Browser Notification API

**Quantifiable Outcomes**:
- **Total time**: 12 minutes for 180 images = 4 seconds per image avg
- **Success rate**: 176/180 = 97.8%
- **Polling requests**: 144 requests over 12 minutes (every 5s)
- **Bandwidth**: 144 × 1KB response = 144KB
- **First image**: Appears after ~30 seconds
- **50% complete**: After ~6 minutes
- **95% complete**: After ~11 minutes

**Scenario Example**:

> Sarah clicks "Generate" and watches the progress bar. After 30 seconds, the first 3 images appear. She gets a coffee and returns 10 minutes later to find 165 of 180 images complete. After 12 minutes total, all images are done (4 failures due to AI timeout). She receives a browser notification and downloads the successful images.

---

### UC-006: Downloading and Organizing Generated Images

**Actor**: Logged-in user with completed studioSession

**Preconditions**:
- StudioSession has status `completed`
- At least 1 GeneratedImage has status `completed`
- Images uploaded to R2 and accessible

**Main Flow**:

1. User is on `/studioSessions/{id}/results` (176 completed images)
2. System displays gallery:
   - Grouped by product (45 products, ~4 images each)
   - Each image shows product name, room type, download button
3. User wants to download all images
4. User clicks "Download All" button (top right)
5. System shows confirmation modal:
   - "Prepare ZIP file with 176 images (~352 MB)?"
   - Estimated time: "1-2 minutes"
   - [Cancel] [Download]
6. User clicks "Download"
7. System creates background job:
   ```typescript
   POST /api/studioSessions/{id}/download
   Response: { jobId: "download_xyz", status: "pending" }
   ```
8. System shows progress modal:
   - "Preparing your download..."
   - Progress bar (0% → 100%)
   - "Packaging 176 images... (23/176)"
9. Background worker processes download job:
   ```typescript
   // Fetch all image URLs from R2
   const images = await getCompletedImages(studioSessionId);

   // Download images from R2 to temp directory
   for (const image of images) {
     const file = await s3.getObject(image.s3Key);
     tempFiles.push({ path: image.filename, data: file });
   }

   // Create ZIP archive
   const zip = new AdmZip();
   for (const file of tempFiles) {
     zip.addFile(file.path, file.data);
   }

   // Upload ZIP to R2 with expiration
   const zipKey = `downloads/${jobId}.zip`;
   await s3.putObject(zipKey, zip.toBuffer(), {
     expiresIn: 86400 // 24 hours
   });

   // Update job status
   await db.downloadJobs.update({
     where: { id: jobId },
     data: {
       status: 'completed',
       zipUrl: getSignedUrl(zipKey),
       expiresAt: Date.now() + 86400000
     }
   });
   ```
10. After 90 seconds, ZIP ready
11. System shows success modal:
    - "Download Ready! ✓"
    - File size: "352 MB"
    - [Download ZIP]
    - "Link expires in 24 hours"
12. User clicks "Download ZIP"
13. Browser downloads file: `summer-catalog-2026.zip`
14. User extracts ZIP locally:
    ```
    summer-catalog-2026/
    ├── modern-desk_living-room_1.jpg
    ├── modern-desk_living-room_2.jpg
    ├── modern-desk_living-room_3.jpg
    ├── modern-desk_bedroom_1.jpg
    ├── velvet-sofa_living-room_1.jpg
    ...
    ```

**Alternative Flows**:

**A1: Download single image**
- User hovers over image
- User clicks download icon (⬇️)
- System generates signed URL: `s3.getSignedUrl(imageKey, { expiresIn: 3600 })`
- Browser downloads image directly: `modern-desk_living-room_1.jpg`
- Filename format: `{product-slug}_{room-type}_{variant}.jpg`

**A2: Download selected images (bulk select)**
- User enters selection mode (checkbox appears on images)
- User selects 23 images
- User clicks "Download Selected (23)"
- Same ZIP process as "Download All" but only selected images

**A3: Download by product (folder structure)**
- User clicks "Download All" with "Group by Product" option
- ZIP structure organized by product:
  ```
  summer-catalog-2026/
  ├── modern-desk/
  │   ├── living-room_1.jpg
  │   ├── living-room_2.jpg
  │   └── bedroom_1.jpg
  ├── velvet-sofa/
  │   ├── living-room_1.jpg
  │   └── living-room_2.jpg
  ...
  ```

**A4: Download by room type**
- User clicks "Download All" with "Group by Room" option
- ZIP structure:
  ```
  summer-catalog-2026/
  ├── living-room/
  │   ├── modern-desk_1.jpg
  │   ├── velvet-sofa_1.jpg
  ├── bedroom/
  │   ├── king-bed_1.jpg
  ...
  ```

**A5: User downloads again (within 24 hours)**
- ZIP already created and cached
- System reuses existing ZIP URL
- No re-processing needed
- Download instant

**Exception Handling**:

- **ZIP creation fails**: Show error "Download preparation failed. Try again.", retry button
- **R2 access denied**: Show error "Unable to access images. Contact support.", log error
- **Download job timeout (>5 minutes)**: Cancel job, show error "Download took too long. Try selecting fewer images."
- **ZIP too large (>2GB)**: Show warning "Too many images. Try downloading in smaller batches.", suggest filtering
- **User quota exceeded**: Still allow downloads (downloads don't count against quota)
- **Expired ZIP link (>24 hours)**: Show message "Download link expired. Generate new link?", recreate ZIP

**Postconditions**:
- ZIP file created and cached in R2 (24-hour expiration)
- User has local copy of images
- Download job record saved (for analytics)
- No changes to GeneratedImages (read-only operation)

**Success Criteria**:
- ✅ ZIP creation completes in <2 minutes for 200 images
- ✅ Filenames are descriptive and organized
- ✅ No corrupted images in ZIP
- ✅ Download link works on all browsers
- ✅ ZIP expires after 24 hours (automatic cleanup)
- ✅ User can re-download within 24 hours without regenerating

**Related Components**:
- Results gallery (Design Log #005, Screen 5)
- Download buttons and modals
- `/api/studioSessions/{id}/download` endpoint
- `/api/download-jobs/{id}` status polling
- R2 signed URLs (Design Log #001)

**Quantifiable Outcomes**:
- **Files**: 176 JPG images
- **Total size**: 352 MB (2MB avg per image)
- **ZIP creation time**: 90 seconds
- **Download bandwidth**: 352 MB
- **Storage**: ZIP cached in R2 for 24 hours
- **Filename pattern**: `{product}_{room}_{variant}.jpg`

**Scenario Example**:

> Sarah downloads all 176 images as a ZIP file. After 90 seconds, the ZIP is ready (352 MB). She downloads it and extracts the files organized by product name. She uploads these images to her website's product pages and shares them with her social media team.

---

### UC-007: Pinning Images for Reuse

**Actor**: Logged-in user reviewing generated images

**Preconditions**:
- User viewing results gallery
- At least 1 GeneratedImage with status `completed`

**Main Flow**:

1. User browses studioSession results (176 images)
2. User finds a particularly good image:
   - Modern Desk in bright, minimalist living room
   - Perfect lighting, clean composition
3. User hovers over image
4. User clicks "Pin" button (📌 icon)
5. System updates database:
   ```typescript
   await db.generatedImages.update({
     where: { id: imageId },
     data: { pinned: true }
   });
   ```
6. System performs optimistic update:
   - UI shows pin icon as filled (📌 → 📌✓)
   - Shows toast: "Pinned! You can reuse this as inspiration."
7. User pins 4 more images (5 total pinned)
8. User creates new studioSession (weeks later)
9. User navigates to Step 3 (Inspire)
10. User selects "My Library" tab
11. System loads pinned images:
    ```typescript
    GET /api/generated-images?pinned=true&clientId={id}
    ```
12. System displays 5 pinned images in grid
13. User can filter by room type: "Living Room"
14. System shows 3 matching pinned images
15. User selects 2 pinned images as inspiration
16. System uses these as inspiration for new studioSession
17. New studioSession inherits style attributes from pinned images

**Alternative Flows**:

**A1: Unpin an image**
- User clicks pinned image's pin icon again
- System shows confirmation: "Unpin this image?"
- User confirms
- System updates: `pinned: false`
- Image removed from library

**A2: Pin from different view**
- User can pin from:
  - Results gallery (main use case)
  - Lightbox modal (full-size view)
  - Product detail page
- Same pin action, different UI location

**A3: Pin limit reached (e.g., 50 pins max)**
- User tries to pin 51st image
- System shows warning: "Maximum 50 pinned images. Unpin others to pin more."
- Pin button disabled

**A4: Pinned image deleted**
- User pins image, then deletes it (soft-delete)
- Image remains pinned but marked `deletedAt`
- Library filters out deleted images: `WHERE pinned = true AND deletedAt IS NULL`

**Exception Handling**:

- **Pin API fails (network)**: Rollback optimistic update, show error "Failed to pin. Try again."
- **Database write fails**: Retry once, show error, log to monitoring
- **User not authorized**: Show error "You don't have permission to pin images."
- **Image not found**: Show error "Image no longer exists."

**Postconditions**:
- GeneratedImage has `pinned = true`
- Image appears in "My Library" tab
- Image available for reuse in future studioSessions
- Pin count tracked per user (analytics)

**Success Criteria**:
- ✅ Pin action completes in <500ms
- ✅ Optimistic update provides instant feedback
- ✅ Pinned images persist across sessions
- ✅ Library tab shows all pinned images
- ✅ Filter by room type works correctly
- ✅ Pinned images can be unpinned

**Related Components**:
- Results gallery (Design Log #005, Screen 5)
- Image card with pin button
- Library tab in inspiration picker (Design Log #005, Step 3)
- `/api/generated-images/{id}` PATCH endpoint
- `pinned` field in generated_images table (Design Log #003)

**Quantifiable Outcomes**:
- **Pin action time**: <500ms (optimistic update)
- **Pinned images**: 5 out of 176 (2.8%)
- **Reuse**: Pinned images used in 3 future studioSessions
- **Storage**: No additional storage (references existing images)

**Scenario Example**:

> Sarah finds 5 images with perfect lighting and composition. She pins them by clicking the pin icon. Three weeks later, when creating a new studioSession for fall products, she selects these pinned images in the "My Library" tab. The new studioSession inherits the same lighting and style, ensuring brand consistency across seasonal catalogs.

---

### UC-008: Regenerating with Different Settings

**Actor**: Logged-in user dissatisfied with generated image

**Preconditions**:
- User has GeneratedImage (completed or error)
- User has remaining quota
- Original settings and product available

**Main Flow**:

1. User viewing results gallery
2. User finds an image they want to improve:
   - King Bed in bedroom
   - Current: Dark lighting, too many props
   - Desired: Brighter, more minimal
3. User hovers over image
4. User clicks "Regenerate" button (🔄)
5. System opens regeneration modal:
   - Shows current image preview
   - Shows current settings:
     ```typescript
     {
       roomType: "Bedroom",
       style: "Contemporary",
       lighting: "Ambient",
       colorScheme: "Warm Tones",
       props: ["Plants", "Books", "Lamps"],
       varietyLevel: 5
     }
     ```
6. User adjusts settings:
   - Lighting: "Ambient" → "Natural Light"
   - Props: Remove "Books" and "Lamps", keep only "Plants"
   - Variety level: 5 → 7 (more creative)
7. User clicks "Regenerate"
8. System creates new GeneratedImage:
   ```typescript
   const newImage = await db.generatedImages.create({
     data: {
       clientId,
       studioSessionId,
       productId, // Same product
       type: 'image',
       status: 'pending',
       settings: adjustedSettings,
       pinned: false
     }
   });
   ```
9. System enqueues new job:
   ```typescript
   const jobId = await queue.enqueue({
     imageId: newImage.id,
     clientId,
     productId,
     settings: adjustedSettings
   });
   ```
10. System updates image with jobId:
    ```typescript
    await db.generatedImages.update({
      where: { id: newImage.id },
      data: { jobId }
    });
    ```
11. System closes modal, returns to gallery
12. System shows new "Generating..." card in gallery
13. Background worker processes job (30 seconds)
14. New image appears in gallery
15. User compares original vs. regenerated:
    - Original: Dark, cluttered
    - Regenerated: Bright, minimal ✓
16. User is satisfied, deletes original
17. User keeps regenerated version

**Alternative Flows**:

**A1: Regenerate with completely different room type**
- User changes: Bedroom → Living Room
- Product (King Bed) may look odd in Living Room
- System shows warning: "This product is typically used in Bedroom. Continue?"
- User confirms, proceeds
- May need another regeneration if result unsatisfactory

**A2: Regenerate failed image**
- Original image has status `error`
- User clicks "Retry" (same as regenerate)
- Uses same settings, retries generation
- If fails again, user can adjust settings

**A3: Regenerate multiple times (A/B testing)**
- User regenerates same product 3 times with different styles:
  - Modern
  - Rustic
  - Industrial
- System creates 3 new images
- User compares all 4 versions (original + 3 regenerations)
- User picks best, deletes others

**A4: Regenerate entire studioSession**
- User clicks "Regenerate StudioSession" (future feature)
- System creates new studioSession with same products, new settings
- Preserves original studioSession for comparison

**Exception Handling**:

- **Quota exceeded**: Show modal "Monthly limit reached. Upgrade to continue.", disable regenerate button
- **Regeneration fails**: Mark image as `error`, show error message, offer retry
- **Product deleted**: Show error "Product no longer exists. Cannot regenerate."
- **Invalid settings**: Validate before enqueueing, show inline errors

**Postconditions**:
- New GeneratedImage created (separate from original)
- Original image unchanged (preserved for comparison)
- New image generated and uploaded to R2
- User quota decremented by 1
- Both images visible in gallery (user can delete original)

**Success Criteria**:
- ✅ Regeneration modal pre-fills current settings
- ✅ All settings editable
- ✅ New image generates in <60 seconds
- ✅ Original image preserved (not overwritten)
- ✅ User can compare side-by-side
- ✅ Quota properly decremented

**Related Components**:
- Results gallery (Design Log #005, Screen 5)
- Regenerate modal
- Image card with regenerate button
- `/api/generated-images` POST endpoint (create new image)
- GenerationQueue service (Design Log #001)

**Quantifiable Outcomes**:
- **Regeneration time**: 30 seconds
- **Quota cost**: 1 generation per regeneration
- **Comparison**: User has 2 versions to choose from
- **Success rate**: 85% satisfied with regenerated version (no further regeneration needed)

**Scenario Example**:

> Sarah regenerates an image of a King Bed because the original had poor lighting. She adjusts the settings to use "Natural Light" and removes unnecessary props. After 30 seconds, the new image is perfect—bright and minimal. She deletes the original and keeps the regenerated version for her catalog.

---

## Secondary Use Cases

### UC-009: Managing Products Catalog

**Actor**: Logged-in user (Mike - catalog manager, 1000+ products)

**Preconditions**:
- User has editor or owner role
- Client account active

**Main Flow**:

**Adding Products (CSV Import)**

1. User navigates to `/products`
2. User clicks "+ Add Products"
3. User selects "Import CSV"
4. System shows CSV template download link
5. User downloads template: `products-template.csv`
   ```csv
   name,sku,category,roomTypes,imageUrl
   Modern Desk,DSK-001,Furniture,Office,https://example.com/desk.jpg
   Velvet Sofa,SOF-042,Furniture,"Living Room,Bedroom",https://example.com/sofa.jpg
   ```
6. User fills template with 200 products
7. User uploads CSV file (drag-drop)
8. System validates CSV:
   - Check required columns: name, sku, category
   - Check data types
   - Check for duplicate SKUs
9. System shows preview:
   - "200 products ready to import"
   - Shows first 10 rows
   - Highlights any warnings (missing images, etc.)
10. User clicks "Import"
11. System processes import:
    ```typescript
    for (const row of csvRows) {
      await db.products.create({
        data: {
          clientId,
          name: row.name,
          sku: row.sku,
          category: row.category,
          roomTypes: row.roomTypes.split(','),
          metadata: {
            importedAt: new Date(),
            source: 'csv'
          }
        }
      });
    }
    ```
12. After 30 seconds, import completes
13. System shows success: "200 products imported"
14. System navigates to products list
15. User sees 200 new products

**Editing a Product**

16. User searches for product: "Modern Desk"
17. User clicks "Edit" on product row
18. System opens edit modal with form:
    - Name: "Modern Desk"
    - SKU: "DSK-001" (read-only)
    - Category: "Furniture" (dropdown)
    - Room Types: ["Office"] (multi-select)
    - Image: [Upload new image]
19. User changes room types: ["Office", "Bedroom"]
20. User uploads new image (better quality)
21. User clicks "Save"
22. System updates database:
    ```typescript
    await db.products.update({
      where: { id: productId },
      data: {
        roomTypes: ["Office", "Bedroom"],
        metadata: {
          ...existing,
          updatedAt: new Date()
        }
      }
    });
    ```
23. System closes modal, updates table row

**Deleting a Product**

24. User selects product: "Old Product"
25. User clicks "Delete"
26. System shows confirmation:
    - "Delete 'Old Product'?"
    - "This will not delete generated images."
    - Warning if used in active studioSessions
27. User confirms
28. System soft-deletes:
    ```typescript
    await db.products.update({
      where: { id: productId },
      data: { deletedAt: new Date() }
    });
    ```
29. Product removed from list

**Alternative Flows**:

**A1: Add single product (manual form)**
- User clicks "+ Add Products" → "Add Single Product"
- System shows form (same as edit modal)
- User fills all fields manually
- User clicks "Save"
- Product created

**A2: CSV import with errors**
- CSV has 10 invalid rows (missing SKU, invalid category)
- System shows error summary:
  - "190 valid, 10 errors"
  - Lists errors with row numbers
- User can fix CSV and retry, or import only valid rows

**A3: Bulk delete products**
- User selects multiple products (checkboxes)
- User clicks "Delete Selected (15)"
- System confirms
- All selected products soft-deleted

**Exception Handling**:

- **CSV too large (>10,000 rows)**: Show error "Maximum 10,000 products per import", suggest splitting
- **Duplicate SKUs in CSV**: Show error "Duplicate SKUs found: DSK-001 (rows 5, 10)", prevent import
- **SKU already exists in database**: Skip duplicate, log warning, import others
- **Image URL invalid**: Import product without image, show warning
- **Product in use (active studioSession generating)**: Warn user but allow edit/delete

**Postconditions**:
- Products created/updated/deleted in database
- Products visible/hidden in products list
- Products available for studioSession creation

**Success Criteria**:
- ✅ CSV import handles 1000+ products
- ✅ Import completes in <60 seconds for 500 products
- ✅ Validation catches all errors before import
- ✅ Edit modal pre-fills all current values
- ✅ Soft-delete prevents data loss
- ✅ Search and filter work after import

**Related Components**:
- Products library screen (Design Log #005, Screen 6)
- Add/Edit product modals
- CSV upload component
- `/api/products` endpoints (GET, POST, PATCH, DELETE)
- `products` table (Design Log #003)

**Scenario Example**:

> Mike imports 500 products from a CSV file. The system validates the file and shows 5 errors (missing SKUs). Mike fixes the CSV and re-uploads. All 500 products import successfully in 45 seconds. He can now use these products in studioSessions.

---

### UC-010: Updating Account Settings

**Actor**: Logged-in user

**Preconditions**:
- User authenticated
- User has access to settings page

**Main Flow**:

1. User navigates to `/settings`
2. System displays settings with tabs:
   - Profile
   - Notifications
   - Generation Defaults
   - Account
3. User selects "Notifications" tab
4. System shows current preferences:
   ```typescript
   {
     email: {
       generationCompleted: true,
       generationFailed: true,
       weeklyUsageSummary: false,
       tipsAndBestPractices: false
     },
     browser: {
       generationCompleted: true,
       lowQuotaWarning: true
     },
     frequency: 'realtime'
   }
   ```
5. User changes settings:
   - Weekly usage summary: false → true
   - Tips and best practices: false → true
6. User clicks "Save Changes"
7. System updates database:
   ```typescript
   await db.users.update({
     where: { id: userId },
     data: {
       notificationSettings: updatedSettings
     }
   });
   ```
8. System shows success toast: "Settings saved ✓"
9. User receives test email: "Notification preferences updated"

**Alternative Flows**:

**A1: Update profile information**
- User selects "Profile" tab
- User changes name: "Sarah Chen" → "Sarah Chen-Smith"
- User uploads new profile photo
- User clicks "Save"
- Profile updated

**A2: Change password**
- User selects "Account" tab
- User clicks "Change Password"
- System opens modal
- User enters current password + new password
- System validates, updates password hash
- User logged out of other sessions (security)

**A3: Update generation defaults**
- User selects "Generation Defaults" tab
- User sets preferred aspect ratio: 1:1 → 16:9
- User sets variety level: 5 → 7
- Future studioSessions pre-filled with these defaults

**Postconditions**:
- Settings saved to database
- User preferences applied to future actions
- Confirmation shown to user

**Success Criteria**:
- ✅ All settings persist across sessions
- ✅ Changes take effect immediately
- ✅ Form validation prevents invalid values
- ✅ Success feedback shown

**Related Components**:
- Settings page (Design Log #005, Screen 7)
- Settings tabs and forms
- `/api/settings` endpoints

---

### UC-011: Team Collaboration **[Future]**

**Actor**: Multiple users from same client

**Preconditions**:
- Client has team plan (multi-user)
- Multiple users with different roles

**Main Flow**:

1. Owner invites editor: "john@company.com"
2. John receives invitation, signs up
3. John has editor role (can create/edit studioSessions, cannot manage billing)
4. Sarah (owner) creates studioSession "Summer Catalog"
5. John sees studioSession in shared studioSessions list
6. John can view, edit, or add products to studioSession
7. Real-time updates show when Sarah or John makes changes
8. Activity log shows: "Sarah added 10 products at 2:30 PM"
9. Both can generate, download, pin images
10. Only Sarah can delete studioSession or manage team members

**Future Features**:
- Role-based permissions (owner, editor, viewer)
- Real-time collaboration (WebSockets)
- Activity log per studioSession
- Comments on images
- Shared pinned library

---

### UC-012: API Integration **[Future]**

**Actor**: Developer integrating with external system

**Preconditions**:
- User has API key
- API quota available

**Main Flow**:

1. User generates API key in settings
2. Developer calls API to create studioSession:
   ```bash
   curl -X POST https://api.epox.com/v1/studioSessions \
     -H "Authorization: Bearer sk_live_abc123" \
     -d '{
       "name": "API StudioSession",
       "productIds": ["prod_1", "prod_2"],
       "settings": { "style": "Modern" }
     }'
   ```
3. API returns studioSession ID
4. Developer polls for status:
   ```bash
   curl https://api.epox.com/v1/studioSessions/{id}/status
   ```
5. API returns progress: `{ "completed": 10, "total": 20 }`
6. When complete, developer fetches image URLs:
   ```bash
   curl https://api.epox.com/v1/studioSessions/{id}/images
   ```
7. Developer downloads images programmatically

**Future Features**:
- REST API for all operations
- Webhooks for completion notifications
- Rate limiting per API key
- API documentation (OpenAPI spec)

---

## Edge Cases and Error Scenarios

### EC-001: Network Failures During Generation

**Scenario**: User starts generation, loses internet connection

**Flow**:

1. User on `/studioSessions/{id}/results` (generation in progress)
2. 50 of 180 images completed
3. User's internet disconnects
4. Polling fails (no response from `/api/studioSessions/{id}/status`)
5. System shows banner: "Connection lost. Reconnecting..."
6. System retries polling with exponential backoff:
   - Retry 1: After 2 seconds
   - Retry 2: After 4 seconds
   - Retry 3: After 8 seconds
7. After 3 failures, system shows:
   - "Offline. Generation continues on server."
   - "Refresh page when back online."
8. User's internet reconnects after 5 minutes
9. System auto-retries polling
10. System shows updated progress: "150 of 180 completed"
11. Generation continues normally

**Alternative**: User closes browser while offline
- Generation continues on server (queue-based)
- User returns later, sees completed studioSession
- Email sent when complete

**Handling**:
- ✅ Queue processing independent of client connection
- ✅ Polling auto-retries on reconnection
- ✅ Clear offline indicator
- ✅ No data loss

---

### EC-002: AI Service Failures

**Scenario**: Gemini API returns 500 error during generation

**Flow**:

1. Background worker picks job from queue
2. Worker calls Gemini API to generate image
3. Gemini returns 500 Internal Server Error
4. Worker implements retry logic:
   ```typescript
   let attempts = 0;
   while (attempts < 3) {
     try {
       const image = await gemini.generate(settings);
       break; // Success
     } catch (error) {
       if (error.status === 500 && attempts < 2) {
         await sleep(5000 * (attempts + 1)); // 5s, 10s
         attempts++;
       } else {
         throw error; // Give up
       }
     }
   }
   ```
5. After 3 failures, worker marks image as error:
   ```typescript
   await db.generatedImages.update({
     where: { id: imageId },
     data: {
       status: 'error',
       errorMessage: 'AI service unavailable. Please retry.',
       errorCode: 'GEMINI_ERROR'
     }
   });
   ```
6. Worker continues to next job (doesn't block queue)
7. User sees error in results gallery:
   - Red card: "❌ Generation failed: Modern Desk"
   - Error: "AI service unavailable"
   - [Retry] button
8. User clicks "Retry"
9. System re-enqueues job
10. Retry succeeds (Gemini back online)

**Alternative**: All generations fail (Gemini completely down)
- System pauses queue after 10 consecutive failures
- Admin notified
- Users see: "AI service temporarily unavailable. Retry later."

**Handling**:
- ✅ Retry transient errors (3 attempts)
- ✅ Don't block queue on failures
- ✅ Clear error messages
- ✅ Allow manual retry
- ✅ Admin alerts for systemic issues

---

### EC-003: Quota Limits Reached

**Scenario**: User exceeds monthly generation limit mid-studioSession

**Flow**:

1. User on free plan: 100 generations/month
2. User has used 85 generations so far
3. User creates studioSession with 45 products × 4 variants = 180 generations
4. User clicks "Generate"
5. System checks quota before enqueueing:
   ```typescript
   const usage = await getMonthlyUsage(clientId);
   const limit = client.plan.generationLimit; // 100
   const requested = 180;

   if (usage + requested > limit) {
     throw new QuotaExceededError();
   }
   ```
6. System shows quota modal before generation:
   - "Monthly Limit Exceeded"
   - "You've used 85 of 100 generations"
   - "This studioSession requires 180 generations"
   - "Upgrade to Pro for unlimited generations"
   - [Upgrade] [Cancel]
7. User can either:
   - Upgrade to Pro ($49/month, unlimited)
   - Reduce product selection (85 + 15 = 100, generate only 15 images)
   - Wait until next month (quota resets Feb 1)

**Alternative**: Quota exceeded mid-generation
- User starts with 90 used, generates 15 (total 105)
- After 10 images, quota reached (100 total)
- System pauses queue
- 10 images completed, 5 pending
- User sees: "Quota limit reached. 10 of 15 completed."
- User upgrades, generation resumes
- Remaining 5 images complete

**Handling**:
- ✅ Check quota before starting generation (prevent over-generation)
- ✅ Show clear upgrade path
- ✅ Preserve completed images if quota hit mid-generation
- ✅ Resume generation after upgrade

---

### EC-004: Invalid File Uploads

**Scenario**: User uploads invalid file in Step 3 (Inspire)

**Flow**:

1. User on Step 3 (Upload tab)
2. User drags file: `document.pdf` (not an image)
3. System validates file:
   ```typescript
   const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
   if (!allowedTypes.includes(file.type)) {
     throw new InvalidFileTypeError();
   }
   ```
4. System shows inline error:
   - "Only JPG, PNG, and WebP images are supported"
   - File rejected, not uploaded
5. User drags correct file: `inspiration.jpg` (15MB)
6. System validates size:
   ```typescript
   const maxSize = 10 * 1024 * 1024; // 10MB
   if (file.size > maxSize) {
     throw new FileTooLargeError();
   }
   ```
7. System shows error:
   - "File must be under 10MB (current: 15MB)"
   - "Try compressing the image first"
8. User compresses image to 8MB
9. User uploads again
10. System validates: ✅ JPG, 8MB
11. System uploads to R2
12. Upload succeeds

**Alternative**: Image has unusual dimensions
- User uploads 100×100px image (too small)
- System warns: "Image resolution low. Results may vary."
- User can proceed or upload better image

**Handling**:
- ✅ Validate file type and size before upload
- ✅ Clear, actionable error messages
- ✅ Suggest solutions (compression)
- ✅ Allow retry without losing other selections

---

### EC-005: Concurrent StudioSession Editing

**Scenario**: User edits studioSession in 2 browser tabs simultaneously

**Flow**:

1. User opens studioSession in Tab 1
2. User opens same studioSession in Tab 2
3. In Tab 1, user adds 10 products
4. System auto-saves draft:
   ```typescript
   await db.studioSessions.update({
     where: { id: studioSessionId },
     data: {
       selectedProductIds: [...existing, ...new10],
       updatedAt: new Date()
     }
   });
   ```
5. In Tab 2, user adds different 5 products
6. System auto-saves draft (30 seconds later)
7. Tab 2's save overwrites Tab 1's changes (last write wins)
8. User in Tab 1 refreshes, sees only Tab 2's products
9. Tab 1's 10 products lost

**Ideal Handling (future enhancement)**:
- Implement optimistic locking with version field:
  ```typescript
  await db.studioSessions.update({
    where: { id: studioSessionId, version: currentVersion },
    data: {
      ...updates,
      version: currentVersion + 1
    }
  });
  ```
- If update fails (version mismatch), show conflict modal
- User can merge changes or choose which to keep

**Current MVP Handling**:
- Show warning in UI: "StudioSession open in another tab. Changes may conflict."
- Detect other tabs via localStorage beacon
- Suggest closing other tabs

**Alternative**: Two users editing same studioSession (team collaboration, future)
- Use WebSockets for real-time sync
- Show "Sarah is editing..." indicator
- Lock fields being edited

---

### EC-006: Large Dataset Handling (1000+ Products)

**Scenario**: User (Mike) has 1000+ products, tries to load/select all

**Flow**:

1. User navigates to `/studioSessions/new?step=1`
2. System loads products with pagination:
   ```typescript
   GET /api/products?page=1&limit=50
   Response: {
     products: [...50 products],
     total: 1247,
     pages: 25
   }
   ```
3. System displays 50 products per page
4. User searches: "Desk"
5. System filters on server:
   ```typescript
   GET /api/products?search=desk&page=1&limit=50
   Response: {
     products: [...23 matching products],
     total: 23,
     pages: 1
   }
   ```
6. User selects "Select All Filtered" (23 products)
7. System stores selection in Set: `selectedIds = Set(['prod_1', 'prod_2', ..., 'prod_23'])`
8. User clears search, browses pages
9. User selects more products across multiple pages
10. Selection persists across pages (client-side Set)
11. User tries to select 600 products total
12. System shows warning: "Maximum 500 products per studioSession. Please deselect 100 products."
13. "Continue" button disabled until count ≤500

**Handling**:
- ✅ Server-side pagination (never load 1000+ products at once)
- ✅ Client-side selection state (Set of IDs)
- ✅ Enforce 500 product limit
- ✅ Search and filter on server (fast)
- ✅ Virtual scrolling for large result sets (future)

**Performance**:
- Page load: <2s for 50 products
- Search: <500ms for 1000+ product database
- Selection state: O(1) add/remove with Set

---

## Implementation Plan

### Phase 1: Document and Validate (Week 1)
1. Review all use cases with product team
2. Validate scenarios with user interviews
3. Prioritize use cases (P0 = MVP, P1 = v2, P2 = future)
4. Create test plan from use cases
5. Update design docs based on feedback

### Phase 2: Primary Use Cases (Weeks 2-5)
1. UC-001: Onboarding (Week 2)
2. UC-002: StudioSession creation (Week 3)
3. UC-003-005: Analysis, inspiration, progress (Week 4)
4. UC-006-008: Download, pin, regenerate (Week 5)

### Phase 3: Secondary Use Cases (Week 6)
1. UC-009: Product management (CSV import, edit, delete)
2. UC-010: Settings (profile, notifications, defaults)

### Phase 4: Edge Cases (Week 7)
1. EC-001: Network failures
2. EC-002: AI failures
3. EC-003: Quota limits
4. EC-004: Invalid uploads
5. EC-005: Concurrent editing (basic warning)
6. EC-006: Large datasets

### Phase 5: Testing and QA (Week 8)
1. Create test scenarios from use cases
2. Manual QA for all primary flows
3. Automated tests for edge cases
4. Load testing for large datasets
5. User acceptance testing

---

## Examples

### ✅ Good: Detailed Use Case with Quantifiable Outcomes

```markdown
**UC-002: Creating a StudioSession**

**Quantifiable Outcomes**:
- Time: 7 minutes user interaction + 12 minutes generation = 19 minutes total
- Products: 45 selected from 127 available
- Images: 180 generated (45 × 4 variants)
- Success rate: 176/180 completed (97.8%)
- Cost: 180 × $0.05 = $9.00
- Storage: 360MB (180 × 2MB avg)
- Quota: 180 of 100 monthly limit (triggers upgrade)
```

### ✅ Good: Realistic Persona with Context

```markdown
**Persona: Sarah Chen - Furniture Brand Marketing Manager**
- Age: 32, Marketing Manager at 200-SKU furniture brand
- Goal: Generate seasonal catalogs (4x/year, 50-100 products each)
- Pain: $500-1000 per product for photography, 3-week photoshoots
- Tech skill: Medium (comfortable with SaaS, not a developer)

**Scenario**: Sarah needs summer catalog images. She selects 45 furniture products,
chooses 3 inspiration images from Unsplash showing bright minimalist rooms,
and generates 180 product visualizations in 12 minutes.
```

### ✅ Good: Exception Handling with Retry Logic

```typescript
// AI service failure with exponential backoff
let attempts = 0;
while (attempts < 3) {
  try {
    const image = await gemini.generate(settings);
    return image;
  } catch (error) {
    if (error.status === 500 && attempts < 2) {
      await sleep(5000 * (attempts + 1)); // 5s, 10s
      attempts++;
    } else {
      await markAsError(imageId, 'AI service unavailable');
      throw error;
    }
  }
}
```

### ❌ Bad: Vague Use Case Without Details

```markdown
**UC-002: Create StudioSession**

User creates a studioSession and generates images.

**Success**: StudioSession created.
```

### ❌ Bad: Unrealistic Scenario

```markdown
**Scenario**: User generates 10,000 products in 5 seconds with 100% success rate.
```

---

## Trade-offs

### Comprehensive Documentation vs. Flexibility
**Chosen**: Comprehensive documentation
**Rationale**:
- ✅ Reduces ambiguity during development
- ✅ Provides test scenarios for QA
- ✅ Serves as product requirements
- ❌ Time-consuming to create and maintain
- ❌ May need updates as features evolve

### Realistic Personas vs. Generic Users
**Chosen**: 3 detailed personas
**Rationale**:
- ✅ Grounded in real use cases
- ✅ Helps prioritize features
- ✅ Guides UX decisions
- ❌ May not cover all edge cases
- ❌ Risk of over-indexing on specific personas

### Happy Path vs. Edge Cases
**Chosen**: Both documented
**Rationale**:
- ✅ Happy path shows primary workflows
- ✅ Edge cases ensure robustness
- ✅ Better test coverage
- ❌ More documentation to maintain

### MVP vs. Future Features
**Chosen**: Document both, mark future clearly
**Rationale**:
- ✅ Helps with architecture planning
- ✅ Shows product roadmap
- ✅ Prevents rework later
- ❌ Risk of scope creep
- ❌ May confuse developers on priorities

---

## Success Criteria

- [ ] All 12 use cases documented with flows, exceptions, outcomes
- [ ] 3 realistic personas created with goals and pain points
- [ ] 6 edge cases documented with handling strategies
- [ ] All use cases map to screens/APIs from Design Logs #004-005
- [ ] Quantifiable outcomes included (time, cost, quota, success rate)
- [ ] Test scenarios derivable from use cases
- [ ] Product team approves all primary use cases
- [ ] QA team can create test plans from this document
- [ ] Developers understand all scenarios to implement
- [ ] All flows tested end-to-end in staging environment

---

## References

- Design Log #001: Architecture & Infrastructure
- Design Log #002: Authentication & Authorization
- Design Log #003: Data Model & Terminology
- Design Log #004: User Flows & Journey Planning
- Design Log #005: Screens & UI Components

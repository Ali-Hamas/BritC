# Embedding ARIA on Your Website 🚀

You can easily add the ARIA AI Assistant to any external website. ARIA will act as a concierge, helping your visitors and answering their questions using the BritSync engine.

## 1. Quick Integration (Script Tag)

Add the following code before the closing `</body>` tag on your website:

```html
<!-- BritSync ARIA Configuration -->
<script>
  window.AriaConfig = {
    businessName: "Your Business Name",
    accentColor: "#4f46e5"
  };
</script>

<!-- Load ARIA Widget -->
<script src="https://your-britsync-domain.com/aria-widget.js"></script>
```

> **Note:** Replace `https://your-britsync-domain.com/aria-widget.js` with the actual URL where you host the component (e.g., your Netlify or Vercel URL).

## 2. Manual Mounting (npm/React)

If you are using React on your main website, you can import the component directly:

```tsx
import { AriaWidget } from './components/Chat/AriaWidget';

function App() {
  return (
    <div>
      {/* Your website content */}
      <AriaWidget businessName="Your Business" />
    </div>
  );
}
```

## 3. How it Works

- **Concierge Mode:** When ARIA is loaded on an external website, it automatically switches to a "Concierge" persona. It focuses on helping visitors and providing information rather than internal business automation.
- **Session Based:** The conversation is maintained as long as the visitor stays on the page.
- **Styling:** The widget is fully responsive and features the premium BritSync dark-mode aesthetic with glassmorphism effects.

## 4. Customisation

You can pass the following properties to the `AriaWidget` component:

| Property | Description | Default |
|----------|-------------|---------|
| `businessName` | The name ARIA uses to refer to your business | "BritSync" |
| `initialMessage` | Custom welcome message for visitors | (Built-in greeting) |

---
*For support or advanced integration, ask ARIA in the main BritSync dashboard!*

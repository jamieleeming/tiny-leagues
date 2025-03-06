# Modal Styling Standard

This document outlines the standard styling for modals across the Tiny Leagues application.

## Visual Standards

All modals in the application should have a consistent visual appearance:

1. **Background Color**: The app's default background color (`theme.palette.background.default`)
2. **Border**: A thin black border (1px solid with 30% opacity)
3. **Glow Effect**: A subtle white glow (30px radius with 10% opacity)
4. **Shadow**: A standard drop shadow for depth
5. **Border Radius**: Consistent with the app's theme (2x the standard border radius)

## Implementation

### Using the StyledDialog Component

The easiest way to implement a modal with the standard styling is to use the `StyledDialog` component:

```tsx
import { StyledDialog } from '../components/styled/Layout';
import { DialogContent } from '@mui/material';

const MyModal = ({ open, onClose }) => {
  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md" // Adjust as needed: "xs", "sm", "md", "lg", "xl"
    >
      <DialogContent sx={{ p: 3 }}>
        {/* Modal content goes here */}
      </DialogContent>
    </StyledDialog>
  );
};
```

### Manual Implementation

If you need to customize a Dialog beyond what StyledDialog provides, you can manually apply the styling:

```tsx
import { Dialog } from '@mui/material';

<Dialog
  open={open}
  onClose={onClose}
  PaperProps={{
    sx: {
      borderRadius: theme.shape.borderRadius * 2,
      boxShadow: '0px 0px 30px rgba(255, 255, 255, 0.1), 0px 8px 24px rgba(0, 0, 0, 0.2)',
      backgroundColor: theme.palette.background.default,
      backgroundImage: 'none',
      border: '1px solid rgba(0, 0, 0, 0.3)'
    }
  }}
>
  {/* Modal content */}
</Dialog>
```

## Best Practices

1. **Consistency**: Always use the StyledDialog component for new modals
2. **Content Padding**: Use consistent padding (3 units) for modal content
3. **Headers**: If your modal has a header, use the SectionTitle component
4. **Dividers**: Use dividers sparingly to separate content sections
5. **Actions**: Place action buttons at the bottom right of the modal

## Examples

See the following components for examples of properly styled modals:

- `GameResultsDialog` - A complex modal with search, table, and actions
- `DeleteConfirmationDialog` - A simple confirmation modal

## Accessibility

Ensure all modals:
1. Can be closed with the ESC key
2. Have proper focus management
3. Include descriptive aria labels
4. Have sufficient color contrast 
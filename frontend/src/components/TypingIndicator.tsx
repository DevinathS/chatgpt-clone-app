import { Box, keyframes } from '@mui/material';

const pulse = keyframes`
  0%, 80%, 100% { opacity: .25; transform: scale(.8); }
  40% { opacity: 1; transform: scale(1); }
`;

export default function TypingIndicator() {
  return (
    <Box role="status" aria-label="Assistant is typing" sx={{ display: 'flex', gap: 0.75, py: 1.5 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'text.primary',
            animation: `${pulse} 1.2s infinite ease-in-out`,
            animationDelay: `${i * 0.16}s`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.6 },
          }}
        />
      ))}
    </Box>
  );
}

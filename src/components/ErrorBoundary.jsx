import React from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleBack = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;

      if (fallback) {
        return fallback;
      }

      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            p: 3
          }}
        >
          <Paper
            elevation={0}
            sx={{
              maxWidth: 480,
              width: '100%',
              p: 4,
              borderRadius: '16px',
              textAlign: 'center',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
            }}
          >
            <ErrorOutlineIcon
              sx={{
                fontSize: 64,
                color: '#dc2626',
                mb: 2
              }}
            />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: '#1e293b',
                mb: 1
              }}
            >
              Something went wrong
            </Typography>
            <Typography
              sx={{
                color: '#64748b',
                mb: 3
              }}
            >
              We encountered an unexpected error. Please try again or go back.
            </Typography>

            {this.state.error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  textAlign: 'left',
                  '& .MuiAlert-message': { width: '100%' }
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Error details:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    wordBreak: 'break-word'
                  }}
                >
                  {this.state.error.toString()}
                </Typography>
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={this.handleBack}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  borderRadius: '10px',
                  borderColor: '#e2e8f0',
                  color: '#64748b',
                  '&:hover': {
                    borderColor: '#cbd5e1',
                    backgroundColor: '#f8fafc'
                  }
                }}
              >
                Go Back
              </Button>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)'
                  }
                }}
              >
                Reload Page
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

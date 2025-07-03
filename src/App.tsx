import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Mail, Building, Shield, Users, Zap, Loader2, X, Check, Copy, Upload, AlertCircle, HelpCircle } from 'lucide-react'
import { InteractiveBackground } from '@/components/ui/interactive-background'

type Step = 'signup' | 'email-sent' | 'verified' | 'org-setup' | 'domain-verification' | 'org-creation' | 'dashboard' | 'sso-protocol-selection' | 'sso-config' | 'user-provisioning'

function App() {
  const [step, setStep] = useState<Step>('signup')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle')
  const [ssoProtocol, setSsoProtocol] = useState<'saml' | 'oidc' | null>(null)
  const [ssoConfig, setSsoConfig] = useState({
    // SAML fields
    idpEntityId: '',
    idpSsoUrl: '',
    x509Certificate: '',
    // OIDC fields
    issuerUrl: '',
    clientId: '',
    clientSecret: ''
  })
  
  // User Provisioning Configuration
  const [provisioningConfig, setProvisioningConfig] = useState({
    // JIT (Just-In-Time) Provisioning
    jitEnabled: true,
    jitCreateUsers: true,
    jitUpdateUsers: true,
    jitDefaultRole: 'user',
    
    // SCIM Configuration
    scimEnabled: false,
    scimEndpoint: '',
    scimToken: '',
    scimVersion: '2.0',
    
    // Attribute Mapping
    attributeMapping: {
      email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
      displayName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
      role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
    },
    
    // Deprovisioning Rules
    deprovisionOnSuspend: true,
    deprovisionOnDelete: true,
    retentionDays: 30,
    
    // Default Permissions
    defaultPermissions: ['read:profile', 'read:organization'],
    autoAssignGroups: []
  })
  
  // UX Enhancement states
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [fieldValidation, setFieldValidation] = useState<Record<string, boolean>>({})
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null)
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1)
  const [connectionTest, setConnectionTest] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error'
    message?: string
  }>({ status: 'idle' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (fullName && email && password) {
      setStep('email-sent')
    }
  }

  const handleVerifyEmail = () => {
    setStep('verified')
  }

  const handleLogin = () => {
    setStep('org-setup')
  }

  const handleResendEmail = () => {
    alert('Email resent!')
  }

  const handleChangeEmail = () => {
    setStep('signup')
  }

  const handleContinueSetup = () => {
    setStep('domain-verification')
  }


  const handleVerifyDomain = () => {
    setVerificationStatus('checking')
    // Simulate verification process
    setTimeout(() => {
      // Randomly show success or error for demo
      const isSuccess = Math.random() > 0.5
      setVerificationStatus(isSuccess ? 'success' : 'error')
    }, 3000)
  }

  // UX Enhancement Functions
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const isValidEntityId = (entityId: string): boolean => {
    // Check for common Entity ID patterns (URL or URN)
    return isValidUrl(entityId) || /^urn:[a-zA-Z0-9][a-zA-Z0-9-]{0,31}:[a-zA-Z0-9()+,\-.:=@;$_!*'%/?#]+$/.test(entityId)
  }

  const isValidCertificate = (cert: string): boolean => {
    return cert.includes('-----BEGIN CERTIFICATE-----') && cert.includes('-----END CERTIFICATE-----')
  }

  const validateField = (fieldName: string, value: string): string | null => {
    switch (fieldName) {
      case 'idpEntityId':
        if (!value) return 'Entity ID is required'
        if (!isValidEntityId(value)) return 'Invalid Entity ID format'
        return null
      case 'idpSsoUrl':
        if (!value) return 'SSO URL is required'
        if (!isValidUrl(value)) return 'Invalid URL format'
        return null
      case 'issuerUrl':
        if (!value) return 'Issuer URL is required'
        if (!isValidUrl(value)) return 'Invalid URL format'
        return null
      case 'x509Certificate':
        if (!value) return 'Certificate is required'
        if (!isValidCertificate(value)) return 'Invalid certificate format'
        return null
      case 'clientId':
        if (!value) return 'Client ID is required'
        if (value.length < 8) return 'Client ID seems too short'
        return null
      case 'clientSecret':
        if (!value) return 'Client Secret is required'
        if (value.length < 16) return 'Client Secret seems too short'
        return null
      default:
        return null
    }
  }

  const handleFieldChange = (fieldName: string, value: string) => {
    // Update the ssoConfig state
    setSsoConfig(prev => ({ ...prev, [fieldName]: value }))
    
    // Validate the field
    const error = validateField(fieldName, value)
    setFieldErrors(prev => ({ ...prev, [fieldName]: error || '' }))
    setFieldValidation(prev => ({ ...prev, [fieldName]: !error && value.length > 0 }))
    
    // Show suggestions for certain fields
    const suggestions = getFieldSuggestions(fieldName, value)
    if (suggestions.length > 0 && value.length > 2) {
      setShowSuggestions(fieldName)
      setActiveSuggestion(-1)
    } else {
      setShowSuggestions(null)
    }
    
    // Auto-save (simulate)
    if (value.length > 0) {
      setAutoSaveStatus('saving')
      setTimeout(() => setAutoSaveStatus('saved'), 1000)
    }
  }

  const applySuggestion = (fieldName: string, suggestion: string) => {
    setSsoConfig(prev => ({ ...prev, [fieldName]: suggestion }))
    setShowSuggestions(null)
    setActiveSuggestion(-1)
    
    // Validate the suggested value
    const error = validateField(fieldName, suggestion)
    setFieldErrors(prev => ({ ...prev, [fieldName]: error || '' }))
    setFieldValidation(prev => ({ ...prev, [fieldName]: !error && suggestion.length > 0 }))
  }

  const handleKeyDown = (e: React.KeyboardEvent, fieldName: string) => {
    if (showSuggestions === fieldName) {
      const suggestions = getFieldSuggestions(fieldName, ssoConfig[fieldName as keyof typeof ssoConfig])
      
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveSuggestion(prev => (prev + 1) % suggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveSuggestion(prev => prev <= 0 ? suggestions.length - 1 : prev - 1)
      } else if (e.key === 'Enter' && activeSuggestion >= 0) {
        e.preventDefault()
        applySuggestion(fieldName, suggestions[activeSuggestion])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowSuggestions(null)
        setActiveSuggestion(-1)
      }
    }
  }

  const enhancedCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(label)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getFieldSuggestions = (fieldName: string, value: string): string[] => {
    const lowercaseValue = value.toLowerCase()
    
    switch (fieldName) {
      case 'idpEntityId':
        if (lowercaseValue.includes('okta')) {
          return ['https://your-org.okta.com', 'https://your-org.oktapreview.com']
        }
        if (lowercaseValue.includes('azure') || lowercaseValue.includes('microsoft')) {
          return ['https://login.microsoftonline.com/{tenant-id}']
        }
        return []
      case 'idpSsoUrl':
        if (lowercaseValue.includes('okta')) {
          return ['https://your-org.okta.com/app/appname/sso/saml']
        }
        if (lowercaseValue.includes('azure')) {
          return ['https://login.microsoftonline.com/{tenant-id}/saml2']
        }
        return []
      case 'issuerUrl':
        if (lowercaseValue.includes('okta')) {
          return ['https://your-org.okta.com']
        }
        if (lowercaseValue.includes('azure')) {
          return ['https://login.microsoftonline.com/{tenant-id}/v2.0']
        }
        return []
      default:
        return []
    }
  }

  // Auto-save effect
  useEffect(() => {
    if (autoSaveStatus === 'saved') {
      setTimeout(() => setAutoSaveStatus('idle'), 2000)
    }
  }, [autoSaveStatus])

  if (step === 'email-sent') {
    return (
      <InteractiveBackground>
        {/* Main Content */}
        <div className="flex items-center justify-center min-h-screen py-12 relative z-10">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{backgroundColor: '#efe8f0'}}>
                <Mail className="h-8 w-8" style={{color: '#581C60'}} />
              </div>
              <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
              <CardDescription className="text-base">
                We've sent a verification link to <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Click the link in the email to verify your account. If you don't see it, check your spam folder.
              </p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={handleResendEmail} className="w-full h-11">
                  Resend verification email
                </Button>
                <Button variant="ghost" onClick={handleChangeEmail} className="w-full h-11">
                  Change email address
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Bottom navigation buttons */}
        <div className="fixed bottom-4 left-4 z-20">
          <Button variant="ghost" onClick={() => setStep('signup')} className="text-xs text-muted-foreground">
            ← Previous step
          </Button>
        </div>
        <div className="fixed bottom-4 right-4 z-20">
          <Button variant="ghost" onClick={handleVerifyEmail} className="text-xs text-muted-foreground">
            Skip to next step →
          </Button>
        </div>
      </InteractiveBackground>
    )
  }

  if (step === 'verified') {
    return (
      <InteractiveBackground>
        {/* Main Content */}
        <div className="flex items-center justify-center min-h-screen py-12 relative z-10">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{backgroundColor: '#efe8f0'}}>
                <CheckCircle className="h-10 w-10" style={{color: '#581C60'}} />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl font-bold">Email verified successfully!</CardTitle>
                <CardDescription className="text-base">
                  Your account is ready. Please log in for the first time.
                </CardDescription>
              </div>
            </CardHeader>
            <CardFooter>
              <Button onClick={handleLogin} className="w-full h-11" style={{backgroundColor: '#581C60', borderColor: '#581C60'}}>
                Login for the first time
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Bottom navigation buttons */}
        <div className="fixed bottom-4 left-4 z-20">
          <Button variant="ghost" onClick={() => setStep('email-sent')} className="text-xs text-muted-foreground">
            ← Previous step
          </Button>
        </div>
        <div className="fixed bottom-4 right-4 z-20">
          <Button variant="ghost" onClick={() => setStep('org-setup')} className="text-xs text-muted-foreground">
            Skip to next step →
          </Button>
        </div>
      </InteractiveBackground>
    )
  }

  if (step === 'org-setup') {
    return (
      <InteractiveBackground>
        {/* Header */}
        <div className="border-b bg-white relative z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#581C60'}}>
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-xl font-semibold" style={{color: '#581C60'}}>Acme</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Welcome, {fullName}!
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] py-12 relative z-10">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center space-y-6">
              {/* Progress indicator */}
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: '#581C60'}}></div>
                <div className="w-8 h-1 bg-gray-200 rounded"></div>
                <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                <div className="w-8 h-1 bg-gray-200 rounded"></div>
                <div className="w-2 h-2 rounded-full bg-gray-200"></div>
              </div>
              
              {/* Icon and content */}
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{backgroundColor: '#efe8f0'}}>
                  <Building className="h-8 w-8" style={{color: '#581C60'}} />
                </div>
                <div className="space-y-3">
                  <CardTitle className="text-2xl font-bold">Setup your organization to continue</CardTitle>
                  <CardDescription className="text-base">
                    You must verify ownership of your domain to unlock enterprise features and team management.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardFooter className="pt-4">
              <Button 
                onClick={handleContinueSetup}
                className="w-full h-11" 
                style={{backgroundColor: '#581C60', borderColor: '#581C60'}}
              >
                Start Verification
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Bottom navigation buttons */}
        <div className="fixed bottom-4 left-4 z-20">
          <Button variant="ghost" onClick={() => setStep('verified')} className="text-xs text-muted-foreground">
            ← Previous step
          </Button>
        </div>
        <div className="fixed bottom-4 right-4 z-20">
          <Button variant="ghost" onClick={handleContinueSetup} className="text-xs text-muted-foreground">
            Skip to next step →
          </Button>
        </div>
      </InteractiveBackground>
    )
  }

  if (step === 'domain-verification') {
    const verificationToken = '8f4b2e1a-5c9d-4a8e-9f3b-1c7d6a5b4e3f'
    const userDomain = email.split('@')[1] || 'yourdomain.com'

    return (
      <InteractiveBackground>
        {/* Header */}
        <div className="border-b bg-white relative z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#581C60'}}>
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-xl font-semibold" style={{color: '#581C60'}}>Acme</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Welcome, {fullName}!
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] py-12 relative z-10">
          <Card className="w-full max-w-lg shadow-lg">
            <CardHeader className="text-center space-y-6">
              {/* Progress indicator */}
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: '#581C60'}}></div>
                <div className="w-8 h-1 rounded" style={{backgroundColor: '#581C60'}}></div>
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: '#581C60'}}></div>
                <div className="w-8 h-1 bg-gray-200 rounded"></div>
                <div className="w-2 h-2 rounded-full bg-gray-200"></div>
              </div>
              
              {/* Icon and content */}
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{backgroundColor: '#efe8f0'}}>
                  <Shield className="h-8 w-8" style={{color: '#581C60'}} />
                </div>
                <div className="space-y-3">
                  <CardTitle className="text-2xl font-bold">Verify domain ownership</CardTitle>
                  <CardDescription className="text-base">
                    Add the DNS record below to verify you control <strong>{userDomain}</strong>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* DNS Record Instructions */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Add this DNS TXT record to your domain:</Label>
                  <div className="p-4 bg-gray-50 border rounded-lg space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Record name:</span>
                        <button 
                          onClick={() => navigator.clipboard.writeText(`_mymapit-verification.${userDomain}`)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="font-mono text-sm bg-white p-2 rounded border">
                        _mymapit-verification.{userDomain}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Record value:</span>
                        <button 
                          onClick={() => navigator.clipboard.writeText(verificationToken)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="font-mono text-sm bg-white p-2 rounded border break-all">
                        {verificationToken}
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Record type: TXT
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    DNS changes usually take effect within a few minutes
                  </p>
                </div>
              </div>

              {/* Status Messages */}
              {verificationStatus === 'checking' && (
                <Alert className="border-orange-200 bg-orange-50">
                  <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />
                  <AlertDescription className="text-orange-800">
                    <strong>Checking DNS record...</strong> This may take up to 2 minutes
                  </AlertDescription>
                </Alert>
              )}

              {verificationStatus === 'success' && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Domain verified successfully!</strong><br />
                    You can now proceed to the next step.
                  </AlertDescription>
                </Alert>
              )}

              {verificationStatus === 'error' && (
                <Alert className="border-red-200 bg-red-50">
                  <X className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>DNS record not found.</strong><br />
                    <div className="flex items-center justify-between mt-2">
                      <span>Please check your configuration and try again.</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setVerificationStatus('idle')}
                        className="ml-4 h-8"
                      >
                        Retry Verification
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="pt-4">
              {verificationStatus === 'success' ? (
                <Button 
                  onClick={() => setStep('org-creation')}
                  className="w-full h-11" 
                  style={{backgroundColor: '#581C60', borderColor: '#581C60'}}
                >
                  Continue to Organization Setup
                </Button>
              ) : (
                <Button 
                  onClick={handleVerifyDomain}
                  disabled={verificationStatus === 'checking'}
                  className="w-full h-11" 
                  style={{backgroundColor: '#581C60', borderColor: '#581C60'}}
                >
                  {verificationStatus === 'checking' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Domain'
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
        
        {/* Bottom navigation buttons */}
        <div className="fixed bottom-4 left-4 z-20">
          <Button variant="ghost" onClick={() => setStep('org-setup')} className="text-xs text-muted-foreground">
            ← Previous step
          </Button>
        </div>
        <div className="fixed bottom-4 right-4 z-20">
          <Button variant="ghost" onClick={() => setStep('org-creation')} className="text-xs text-muted-foreground">
            Skip to next step →
          </Button>
        </div>
      </InteractiveBackground>
    )
  }

  if (step === 'org-creation') {
    const handleCreateOrganization = (e: React.FormEvent) => {
      e.preventDefault()
      if (organizationName) {
        setStep('dashboard')
      }
    }

    return (
      <InteractiveBackground>
        {/* Header */}
        <div className="border-b bg-white relative z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#581C60'}}>
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-xl font-semibold" style={{color: '#581C60'}}>Acme</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Welcome, {fullName}!
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] py-12 relative z-10">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center space-y-6">
              {/* Progress indicator */}
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: '#581C60'}}></div>
                <div className="w-8 h-1 rounded" style={{backgroundColor: '#581C60'}}></div>
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: '#581C60'}}></div>
                <div className="w-8 h-1 rounded" style={{backgroundColor: '#581C60'}}></div>
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: '#581C60'}}></div>
              </div>
              
              {/* Icon and content */}
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{backgroundColor: '#efe8f0'}}>
                  <Building className="h-8 w-8" style={{color: '#581C60'}} />
                </div>
                <div className="space-y-3">
                  <CardTitle className="text-2xl font-bold">Create your organization</CardTitle>
                  <CardDescription className="text-base">
                    Give your organization a name to complete the setup
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleCreateOrganization}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="organizationName" className="text-sm font-medium">Organization name</Label>
                  <Input
                    id="organizationName"
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Enter your organization name"
                    required
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be displayed throughout your admin dashboard
                  </p>
                </div>
              </CardContent>

              <CardFooter>
                <Button 
                  type="submit"
                  className="w-full h-11" 
                  style={{backgroundColor: '#581C60', borderColor: '#581C60'}}
                >
                  Create Organization
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
        
        {/* Bottom navigation buttons */}
        <div className="fixed bottom-4 left-4 z-20">
          <Button variant="ghost" onClick={() => setStep('domain-verification')} className="text-xs text-muted-foreground">
            ← Previous step
          </Button>
        </div>
        <div className="fixed bottom-4 right-4 z-20">
          <Button variant="ghost" onClick={() => setStep('dashboard')} className="text-xs text-muted-foreground">
            Skip to next step →
          </Button>
        </div>
      </InteractiveBackground>
    )
  }

  if (step === 'sso-protocol-selection') {
    return (
      <InteractiveBackground>
        {/* Header */}
        <div className="border-b bg-white relative z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#581C60'}}>
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-xl font-semibold" style={{color: '#581C60'}}>Acme</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {organizationName || 'Your Organization'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] py-12 relative z-10">
          <Card className="w-full max-w-lg shadow-lg">
            <CardHeader className="text-center space-y-3">
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center" style={{backgroundColor: '#efe8f0'}}>
                  <Shield className="h-6 w-6" style={{color: '#581C60'}} />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl font-bold">Choose SSO Protocol</CardTitle>
                  <CardDescription className="text-sm">
                    Select the authentication protocol for your organization
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {/* SAML Option */}
                <button
                  onClick={() => setSsoProtocol('saml')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSsoProtocol('saml')
                    }
                  }}
                  aria-pressed={ssoProtocol === 'saml'}
                  aria-describedby="saml-description"
                  className={`group relative p-6 rounded-lg border transition-all duration-200 text-left hover:shadow-sm focus:outline-none ${
                    ssoProtocol === 'saml'
                      ? 'border-primary bg-secondary'
                      : 'border-border hover:border-muted-foreground/20 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          ssoProtocol === 'saml' ? 'bg-primary' : 'bg-muted'
                        }`}>
                          <Shield className={`h-4 w-4 ${
                            ssoProtocol === 'saml' ? 'text-primary-foreground' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <h3 className="font-semibold text-base text-foreground">SAML</h3>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Industry standard for enterprise identity providers like Okta, Azure AD
                      </p>
                      {/* Contextual help on hover/focus */}
                      <div className="opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300">
                        <p className="text-xs text-primary/70 font-medium">
                          ✓ Best for: Enterprise organizations
                        </p>
                      </div>
                    </div>
                    {ssoProtocol === 'saml' && (
                      <div className="ml-4">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                </button>

                {/* OIDC Option */}
                <button
                  onClick={() => setSsoProtocol('oidc')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSsoProtocol('oidc')
                    }
                  }}
                  aria-pressed={ssoProtocol === 'oidc'}
                  aria-describedby="oidc-description"
                  className={`group relative p-6 rounded-lg border transition-all duration-200 text-left hover:shadow-sm focus:outline-none ${
                    ssoProtocol === 'oidc'
                      ? 'border-primary bg-secondary'
                      : 'border-border hover:border-muted-foreground/20 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          ssoProtocol === 'oidc' ? 'bg-primary' : 'bg-muted'
                        }`}>
                          <Zap className={`h-4 w-4 ${
                            ssoProtocol === 'oidc' ? 'text-primary-foreground' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <h3 className="font-semibold text-base text-foreground">OIDC</h3>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Modern OAuth 2.0 extension, ideal for cloud-native applications
                      </p>
                      {/* Contextual help on hover/focus */}
                      <div className="opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300">
                        <p className="text-xs text-primary/70 font-medium">
                          ✓ Best for: Modern startups
                        </p>
                      </div>
                    </div>
                    {ssoProtocol === 'oidc' && (
                      <div className="ml-4">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              </div>
              
              {/* Compact helper text */}
              {!ssoProtocol ? (
                <p className="text-center text-xs text-primary/60 font-medium">
                  💡 Not sure? Most enterprises use SAML
                </p>
              ) : (
                <p className="text-center text-xs text-primary/70 font-medium">
                  {ssoProtocol === 'saml' ? '🛡️ Great for enterprise security' : '⚡ Perfect for modern apps'}
                </p>
              )}
            </CardContent>

            <CardFooter>
              <Button 
                onClick={() => setStep('sso-config')}
                disabled={!ssoProtocol}
                className={`w-full h-11 ${
                  ssoProtocol ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''
                }`}
              >
                {ssoProtocol ? `Configure ${ssoProtocol.toUpperCase()}` : 'Select a protocol'}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Bottom navigation buttons */}
        <div className="fixed bottom-4 left-4 z-20">
          <Button variant="ghost" onClick={() => setStep('dashboard')} className="text-xs text-muted-foreground">
            ← Back to Dashboard
          </Button>
        </div>
        <div className="fixed bottom-4 right-4 z-20">
          <Button variant="ghost" onClick={() => setStep('dashboard')} className="text-xs text-muted-foreground">
            Skip to dashboard →
          </Button>
        </div>
      </InteractiveBackground>
    )
  }

  if (step === 'sso-config') {
    const organizationId = 'org_' + Math.random().toString(36).substr(2, 9) // Mock organization ID
    
    const handleSsoConfigSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      // Save configuration and proceed to user provisioning
      setStep('user-provisioning')
    }

    const handleFormKeyDown = (e: React.KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSsoConfigSubmit(e as React.FormEvent)
      }
      // Ctrl+Enter or Cmd+Enter to test
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleTestConnection()
      }
    }


    const handleTestConnection = async () => {
      setConnectionTest({ status: 'testing' })
      
      // Validate required fields first
      const requiredFields = ssoProtocol === 'saml' 
        ? ['idpEntityId', 'idpSsoUrl'] 
        : ['issuerUrl', 'clientId', 'clientSecret']
      
      for (const field of requiredFields) {
        const error = validateField(field, ssoConfig[field as keyof typeof ssoConfig])
        if (error) {
          setConnectionTest({ 
            status: 'error', 
            message: `Please fix ${field}: ${error}` 
          })
          return
        }
      }

      // Simulate connection testing
      try {
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Simulate random success/failure for demo
        const isSuccess = Math.random() > 0.3
        
        if (isSuccess) {
          setConnectionTest({ 
            status: 'success', 
            message: ssoProtocol === 'saml' 
              ? 'SAML metadata validated successfully' 
              : 'OIDC discovery successful'
          })
        } else {
          setConnectionTest({ 
            status: 'error', 
            message: ssoProtocol === 'saml'
              ? 'Unable to reach IdP endpoint'
              : 'Invalid issuer URL or credentials'
          })
        }
      } catch {
        setConnectionTest({ 
          status: 'error', 
          message: 'Network error occurred' 
        })
      }
      
      // Clear status after 5 seconds
      setTimeout(() => {
        setConnectionTest({ status: 'idle' })
      }, 5000)
    }

    // Use enhanced copy function

    return (
      <InteractiveBackground>
        {/* Header */}
        <div className="border-b bg-white relative z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#581C60'}}>
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-xl font-semibold" style={{color: '#581C60'}}>Acme</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {organizationName || 'Your Organization'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] py-6 relative z-10">
          <Card className="w-full max-w-2xl shadow-lg">
            <CardHeader className="text-center space-y-2 pb-4">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary">
                  {ssoProtocol === 'saml' ? (
                    <Shield className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <Zap className="h-4 w-4 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    Configure {ssoProtocol?.toUpperCase()}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {ssoProtocol === 'saml' 
                      ? 'Configure SAML identity provider settings'
                      : 'Configure OpenID Connect provider settings'
                    }
                  </CardDescription>
                </div>
              </div>
              
              {/* Auto-save status */}
              {autoSaveStatus !== 'idle' && (
                <div className="flex items-center justify-center space-x-1 text-xs text-muted-foreground">
                  {autoSaveStatus === 'saving' ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">Changes saved</span>
                    </>
                  )}
                </div>
              )}
            </CardHeader>

            <form onSubmit={handleSsoConfigSubmit} onKeyDown={handleFormKeyDown}>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {/* Service Provider/Application Information */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm text-foreground border-b pb-1">
                      {ssoProtocol === 'saml' ? 'Service Provider Information' : 'Application Information'}
                    </h3>
                    
                    {ssoProtocol === 'saml' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* ACS URL */}
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">ACS URL</Label>
                          <div className="flex items-center space-x-1">
                            <Input 
                              value={`https://sso.mymapit.in/saml/callback/${organizationId}`}
                              readOnly
                              className="flex-1 bg-muted text-xs h-8"
                            />
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm"
                              className="h-8 w-8 p-0 relative"
                              onClick={() => enhancedCopyToClipboard(`https://sso.mymapit.in/saml/callback/${organizationId}`, 'ACS URL')}
                              title="Copy ACS URL"
                            >
                              {copySuccess === 'ACS URL' ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Entity ID */}
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Entity ID</Label>
                          <div className="flex items-center space-x-1">
                            <Input 
                              value={`urn:mymapit:saml:${organizationId}`}
                              readOnly
                              className="flex-1 bg-muted text-xs h-8"
                            />
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm"
                              className="h-8 w-8 p-0 relative"
                              onClick={() => enhancedCopyToClipboard(`urn:mymapit:saml:${organizationId}`, 'Entity ID')}
                              title="Copy Entity ID"
                            >
                              {copySuccess === 'Entity ID' ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Redirect URI</Label>
                        <div className="flex items-center space-x-1">
                          <Input 
                            value="https://sso.mymapit.in/oidc/callback"
                            readOnly
                            className="flex-1 bg-muted text-xs h-8"
                          />
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0 relative"
                            onClick={() => enhancedCopyToClipboard('https://sso.mymapit.in/oidc/callback', 'Redirect URI')}
                            title="Copy Redirect URI"
                          >
                            {copySuccess === 'Redirect URI' ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Identity Provider Configuration */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm text-foreground border-b pb-1">
                      Identity Provider Configuration
                    </h3>
                    
                    {ssoProtocol === 'saml' ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* IdP Entity ID */}
                          <div className="space-y-1">
                            <Label htmlFor="idpEntityId" className="text-xs font-medium flex items-center space-x-1">
                              <span>IdP Entity ID *</span>
                              <button
                                type="button"
                                onMouseEnter={() => setShowTooltip('idpEntityId')}
                                onMouseLeave={() => setShowTooltip(null)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <HelpCircle className="h-3 w-3" />
                              </button>
                              {showTooltip === 'idpEntityId' && (
                                <div className="absolute z-10 bg-popover border rounded p-2 text-xs text-popover-foreground shadow-lg">
                                  Usually found in your IdP metadata. Format: URL or URN
                                </div>
                              )}
                            </Label>
                            <div className="relative">
                              <Input
                                id="idpEntityId"
                                value={ssoConfig.idpEntityId}
                                onChange={(e) => handleFieldChange('idpEntityId', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, 'idpEntityId')}
                                onFocus={() => {
                                  const suggestions = getFieldSuggestions('idpEntityId', ssoConfig.idpEntityId)
                                  if (suggestions.length > 0 && ssoConfig.idpEntityId.length > 2) {
                                    setShowSuggestions('idpEntityId')
                                  }
                                }}
                                onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                                placeholder="https://your-idp.okta.com"
                                required
                                className={`h-8 text-xs pr-6 ${
                                  fieldErrors.idpEntityId ? 'border-red-500' : 
                                  fieldValidation.idpEntityId ? 'border-green-500' : ''
                                }`}
                              />
                              {fieldValidation.idpEntityId && (
                                <Check className="absolute right-2 top-2 h-4 w-4 text-green-500" />
                              )}
                              {fieldErrors.idpEntityId && (
                                <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-red-500" />
                              )}
                              
                              {/* Suggestions dropdown */}
                              {showSuggestions === 'idpEntityId' && (
                                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-popover border rounded-md shadow-lg max-h-32 overflow-y-auto">
                                  {getFieldSuggestions('idpEntityId', ssoConfig.idpEntityId).map((suggestion, index) => (
                                    <button
                                      key={suggestion}
                                      type="button"
                                      onClick={() => applySuggestion('idpEntityId', suggestion)}
                                      className={`w-full text-left px-2 py-1 text-xs hover:bg-muted ${
                                        activeSuggestion === index ? 'bg-muted' : ''
                                      }`}
                                    >
                                      {suggestion}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            {fieldErrors.idpEntityId && (
                              <p className="text-xs text-red-500">{fieldErrors.idpEntityId}</p>
                            )}
                          </div>

                          {/* IdP SSO URL */}
                          <div className="space-y-1">
                            <Label htmlFor="idpSsoUrl" className="text-xs font-medium flex items-center space-x-1">
                              <span>SSO URL *</span>
                              <button
                                type="button"
                                onMouseEnter={() => setShowTooltip('idpSsoUrl')}
                                onMouseLeave={() => setShowTooltip(null)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <HelpCircle className="h-3 w-3" />
                              </button>
                              {showTooltip === 'idpSsoUrl' && (
                                <div className="absolute z-10 bg-popover border rounded p-2 text-xs text-popover-foreground shadow-lg">
                                  SAML SSO endpoint URL from your identity provider
                                </div>
                              )}
                            </Label>
                            <div className="relative">
                              <Input
                                id="idpSsoUrl"
                                type="url"
                                value={ssoConfig.idpSsoUrl}
                                onChange={(e) => handleFieldChange('idpSsoUrl', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, 'idpSsoUrl')}
                                onFocus={() => {
                                  const suggestions = getFieldSuggestions('idpSsoUrl', ssoConfig.idpSsoUrl)
                                  if (suggestions.length > 0 && ssoConfig.idpSsoUrl.length > 2) {
                                    setShowSuggestions('idpSsoUrl')
                                  }
                                }}
                                onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                                placeholder="https://your-idp.okta.com/app/abc/sso/saml"
                                required
                                className={`h-8 text-xs pr-6 ${
                                  fieldErrors.idpSsoUrl ? 'border-red-500' : 
                                  fieldValidation.idpSsoUrl ? 'border-green-500' : ''
                                }`}
                              />
                              {fieldValidation.idpSsoUrl && (
                                <Check className="absolute right-2 top-2 h-4 w-4 text-green-500" />
                              )}
                              {fieldErrors.idpSsoUrl && (
                                <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-red-500" />
                              )}
                              
                              {/* Suggestions dropdown */}
                              {showSuggestions === 'idpSsoUrl' && (
                                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-popover border rounded-md shadow-lg max-h-32 overflow-y-auto">
                                  {getFieldSuggestions('idpSsoUrl', ssoConfig.idpSsoUrl).map((suggestion, index) => (
                                    <button
                                      key={suggestion}
                                      type="button"
                                      onClick={() => applySuggestion('idpSsoUrl', suggestion)}
                                      className={`w-full text-left px-2 py-1 text-xs hover:bg-muted ${
                                        activeSuggestion === index ? 'bg-muted' : ''
                                      }`}
                                    >
                                      {suggestion}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            {fieldErrors.idpSsoUrl && (
                              <p className="text-xs text-red-500">{fieldErrors.idpSsoUrl}</p>
                            )}
                          </div>
                        </div>

                        {/* X.509 Certificate - Full Width */}
                        <div className="space-y-1">
                          <Label htmlFor="x509Certificate" className="text-xs font-medium flex items-center space-x-1">
                            <span>X.509 Signing Certificate *</span>
                            <button
                              type="button"
                              onMouseEnter={() => setShowTooltip('x509Certificate')}
                              onMouseLeave={() => setShowTooltip(null)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <HelpCircle className="h-3 w-3" />
                            </button>
                            {showTooltip === 'x509Certificate' && (
                              <div className="absolute z-10 bg-popover border rounded p-2 text-xs text-popover-foreground shadow-lg">
                                Copy certificate from IdP metadata XML
                              </div>
                            )}
                          </Label>
                          <div className="relative">
                            <textarea
                              id="x509Certificate"
                              value={ssoConfig.x509Certificate}
                              onChange={(e) => handleFieldChange('x509Certificate', e.target.value)}
                              placeholder="-----BEGIN CERTIFICATE-----
MIIC...
-----END CERTIFICATE-----"
                              required
                              className={`w-full h-16 px-2 py-1 text-xs border rounded resize-none ${
                                fieldErrors.x509Certificate ? 'border-red-500' : 
                                fieldValidation.x509Certificate ? 'border-green-500' : 'border-input'
                              } bg-background`}
                            />
                            {fieldValidation.x509Certificate && (
                              <Check className="absolute right-2 top-2 h-4 w-4 text-green-500" />
                            )}
                            {fieldErrors.x509Certificate && (
                              <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-red-500" />
                            )}
                          </div>
                          {fieldErrors.x509Certificate && (
                            <p className="text-xs text-red-500">{fieldErrors.x509Certificate}</p>
                          )}
                        </div>

                        {/* XML Upload Helper */}
                        <div className="p-2 bg-muted/30 rounded border-dashed border">
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <Upload className="h-3 w-3" />
                            <span>Upload IdP metadata XML to auto-populate fields</span>
                            <Button type="button" variant="ghost" size="sm" className="h-5 px-1 text-xs ml-auto">
                              Browse
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Issuer URL */}
                        <div className="space-y-1 md:col-span-2">
                          <Label htmlFor="issuerUrl" className="text-xs font-medium flex items-center space-x-1">
                            <span>Issuer URL *</span>
                            <button
                              type="button"
                              onMouseEnter={() => setShowTooltip('issuerUrl')}
                              onMouseLeave={() => setShowTooltip(null)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <HelpCircle className="h-3 w-3" />
                            </button>
                            {showTooltip === 'issuerUrl' && (
                              <div className="absolute z-10 bg-popover border rounded p-2 text-xs text-popover-foreground shadow-lg">
                                OIDC issuer URL from your identity provider
                              </div>
                            )}
                          </Label>
                          <div className="relative">
                            <Input
                              id="issuerUrl"
                              type="url"
                              value={ssoConfig.issuerUrl}
                              onChange={(e) => handleFieldChange('issuerUrl', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, 'issuerUrl')}
                              onFocus={() => {
                                const suggestions = getFieldSuggestions('issuerUrl', ssoConfig.issuerUrl)
                                if (suggestions.length > 0 && ssoConfig.issuerUrl.length > 2) {
                                  setShowSuggestions('issuerUrl')
                                }
                              }}
                              onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                              placeholder="https://your-org.okta.com"
                              required
                              className={`h-8 text-xs pr-6 ${
                                fieldErrors.issuerUrl ? 'border-red-500' : 
                                fieldValidation.issuerUrl ? 'border-green-500' : ''
                              }`}
                            />
                            {fieldValidation.issuerUrl && (
                              <Check className="absolute right-2 top-2 h-4 w-4 text-green-500" />
                            )}
                            {fieldErrors.issuerUrl && (
                              <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-red-500" />
                            )}
                            
                            {/* Suggestions dropdown */}
                            {showSuggestions === 'issuerUrl' && (
                              <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-popover border rounded-md shadow-lg max-h-32 overflow-y-auto">
                                {getFieldSuggestions('issuerUrl', ssoConfig.issuerUrl).map((suggestion, index) => (
                                  <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => applySuggestion('issuerUrl', suggestion)}
                                    className={`w-full text-left px-2 py-1 text-xs hover:bg-muted ${
                                      activeSuggestion === index ? 'bg-muted' : ''
                                    }`}
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {fieldErrors.issuerUrl && (
                            <p className="text-xs text-red-500">{fieldErrors.issuerUrl}</p>
                          )}
                        </div>

                        {/* Client ID */}
                        <div className="space-y-1">
                          <Label htmlFor="clientId" className="text-xs font-medium flex items-center space-x-1">
                            <span>Client ID *</span>
                            <button
                              type="button"
                              onMouseEnter={() => setShowTooltip('clientId')}
                              onMouseLeave={() => setShowTooltip(null)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <HelpCircle className="h-3 w-3" />
                            </button>
                            {showTooltip === 'clientId' && (
                              <div className="absolute z-10 bg-popover border rounded p-2 text-xs text-popover-foreground shadow-lg">
                                Client ID from your OIDC application
                              </div>
                            )}
                          </Label>
                          <div className="relative">
                            <Input
                              id="clientId"
                              value={ssoConfig.clientId}
                              onChange={(e) => handleFieldChange('clientId', e.target.value)}
                              placeholder="0oa2b3c4d5e6f7g8h9i0"
                              required
                              className={`h-8 text-xs pr-6 ${
                                fieldErrors.clientId ? 'border-red-500' : 
                                fieldValidation.clientId ? 'border-green-500' : ''
                              }`}
                            />
                            {fieldValidation.clientId && (
                              <Check className="absolute right-2 top-2 h-4 w-4 text-green-500" />
                            )}
                            {fieldErrors.clientId && (
                              <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-red-500" />
                            )}
                          </div>
                          {fieldErrors.clientId && (
                            <p className="text-xs text-red-500">{fieldErrors.clientId}</p>
                          )}
                        </div>

                        {/* Client Secret */}
                        <div className="space-y-1">
                          <Label htmlFor="clientSecret" className="text-xs font-medium flex items-center space-x-1">
                            <span>Client Secret *</span>
                            <button
                              type="button"
                              onMouseEnter={() => setShowTooltip('clientSecret')}
                              onMouseLeave={() => setShowTooltip(null)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <HelpCircle className="h-3 w-3" />
                            </button>
                            {showTooltip === 'clientSecret' && (
                              <div className="absolute z-10 bg-popover border rounded p-2 text-xs text-popover-foreground shadow-lg">
                                Client secret from your OIDC application
                              </div>
                            )}
                          </Label>
                          <div className="relative">
                            <Input
                              id="clientSecret"
                              type="password"
                              value={ssoConfig.clientSecret}
                              onChange={(e) => handleFieldChange('clientSecret', e.target.value)}
                              placeholder="abc123def456ghi789jkl012"
                              required
                              className={`h-8 text-xs pr-6 ${
                                fieldErrors.clientSecret ? 'border-red-500' : 
                                fieldValidation.clientSecret ? 'border-green-500' : ''
                              }`}
                            />
                            {fieldValidation.clientSecret && (
                              <Check className="absolute right-2 top-2 h-4 w-4 text-green-500" />
                            )}
                            {fieldErrors.clientSecret && (
                              <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-red-500" />
                            )}
                          </div>
                          {fieldErrors.clientSecret && (
                            <p className="text-xs text-red-500">{fieldErrors.clientSecret}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-3 pt-4">
                {/* Connection test status */}
                {connectionTest.status !== 'idle' && (
                  <div className={`flex items-center justify-center space-x-2 text-xs p-2 rounded ${
                    connectionTest.status === 'testing' ? 'bg-muted text-muted-foreground' :
                    connectionTest.status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                    'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {connectionTest.status === 'testing' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : connectionTest.status === 'success' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    <span>{connectionTest.message || 'Testing connection...'}</span>
                  </div>
                )}
                
                <div className="flex space-x-2 w-full">
                  <Button 
                    type="submit"
                    className="flex-1 h-9 bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
                  >
                    Save Configuration
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={connectionTest.status === 'testing'}
                    className="flex-1 h-9 text-sm"
                    title="Test connection (Ctrl+Enter)"
                  >
                    {connectionTest.status === 'testing' ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Testing...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
        
        {/* Bottom navigation buttons */}
        <div className="fixed bottom-4 left-4 z-20">
          <Button variant="ghost" onClick={() => setStep('sso-protocol-selection')} className="text-xs text-muted-foreground">
            ← Back to Protocol
          </Button>
        </div>
        <div className="fixed bottom-4 right-4 z-20">
          <Button variant="ghost" onClick={() => setStep('dashboard')} className="text-xs text-muted-foreground">
            Skip to dashboard →
          </Button>
        </div>
      </InteractiveBackground>
    )
  }

  if (step === 'user-provisioning') {
    const handleProvisioningSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      // Save provisioning configuration and proceed to dashboard
      setStep('dashboard')
    }

    const handleProvisioningFieldChange = (field: string, value: any) => {
      setProvisioningConfig(prev => ({ ...prev, [field]: value }))
      
      // Auto-save simulation
      setAutoSaveStatus('saving')
      setTimeout(() => setAutoSaveStatus('saved'), 1000)
    }

    const handleAttributeMappingChange = (attribute: string, value: string) => {
      setProvisioningConfig(prev => ({
        ...prev,
        attributeMapping: { ...prev.attributeMapping, [attribute]: value }
      }))
      
      // Auto-save simulation
      setAutoSaveStatus('saving')
      setTimeout(() => setAutoSaveStatus('saved'), 1000)
    }

    const generateScimToken = () => {
      const token = 'scim_' + Math.random().toString(36).substr(2, 32)
      setProvisioningConfig(prev => ({ ...prev, scimToken: token }))
      enhancedCopyToClipboard(token, 'SCIM Token')
    }

    const [provisioningTest, setProvisioningTest] = useState<{
      status: 'idle' | 'testing' | 'success' | 'error'
      message?: string
      details?: string[]
    }>({ status: 'idle' })

    const handleTestProvisioning = async () => {
      setProvisioningTest({ status: 'testing' })
      
      try {
        // Simulate comprehensive provisioning tests
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        const testResults = []
        
        // Test JIT provisioning
        if (provisioningConfig.jitEnabled) {
          testResults.push('✓ JIT provisioning configuration valid')
        }
        
        // Test SCIM if enabled
        if (provisioningConfig.scimEnabled) {
          if (provisioningConfig.scimToken) {
            testResults.push('✓ SCIM endpoint accessible')
            testResults.push('✓ SCIM token authentication successful')
          } else {
            testResults.push('✗ SCIM token required')
          }
        }
        
        // Test attribute mapping
        const requiredMappings = ['email', 'firstName', 'lastName']
        const validMappings = requiredMappings.filter(attr => {
          const mapping = (provisioningConfig.attributeMapping as any)[attr]
          return mapping && mapping.length > 0
        })
        
        if (validMappings.length === requiredMappings.length) {
          testResults.push('✓ Required attribute mappings configured')
        } else {
          testResults.push(`✗ Missing mappings: ${requiredMappings.filter(attr => !validMappings.includes(attr)).join(', ')}`)
        }
        
        // Simulate random success/failure for demo
        const isSuccess = Math.random() > 0.2
        
        if (isSuccess) {
          setProvisioningTest({ 
            status: 'success', 
            message: 'Provisioning configuration validated successfully',
            details: testResults
          })
        } else {
          setProvisioningTest({ 
            status: 'error', 
            message: 'Some provisioning tests failed',
            details: [...testResults, '✗ IdP connection timeout']
          })
        }
      } catch (error) {
        setProvisioningTest({ 
          status: 'error', 
          message: 'Test failed due to network error',
          details: ['✗ Unable to reach provisioning endpoints']
        })
      }
      
      // Clear status after 10 seconds
      setTimeout(() => {
        setProvisioningTest({ status: 'idle' })
      }, 10000)
    }

    return (
      <InteractiveBackground>
        {/* Header */}
        <div className="border-b bg-white relative z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#581C60'}}>
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-xl font-semibold" style={{color: '#581C60'}}>Acme</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {organizationName || 'Your Organization'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] py-6 relative z-10">
          <Card className="w-full max-w-4xl shadow-lg">
            <CardHeader className="text-center space-y-2 pb-4">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary">
                  <Users className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    User Provisioning & Directory Sync
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure how users are created, updated, and managed through SSO
                  </CardDescription>
                </div>
              </div>
              
              {/* Auto-save status */}
              {autoSaveStatus !== 'idle' && (
                <div className="flex items-center justify-center space-x-1 text-xs text-muted-foreground">
                  {autoSaveStatus === 'saving' ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">Changes saved</span>
                    </>
                  )}
                </div>
              )}
            </CardHeader>

            <form onSubmit={handleProvisioningSubmit}>
              <CardContent className="space-y-6">
                {/* JIT Provisioning Section */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-foreground border-b pb-1">
                    Just-In-Time (JIT) Provisioning
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="jitEnabled"
                          checked={provisioningConfig.jitEnabled}
                          onChange={(e) => handleProvisioningFieldChange('jitEnabled', e.target.checked)}
                          className="rounded border-input"
                        />
                        <Label htmlFor="jitEnabled" className="text-sm font-medium">Enable JIT Provisioning</Label>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        Automatically create user accounts when users sign in via SSO for the first time
                      </p>
                      
                      {provisioningConfig.jitEnabled && (
                        <div className="ml-6 space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="jitCreateUsers"
                              checked={provisioningConfig.jitCreateUsers}
                              onChange={(e) => handleProvisioningFieldChange('jitCreateUsers', e.target.checked)}
                              className="rounded border-input"
                            />
                            <Label htmlFor="jitCreateUsers" className="text-xs">Create new users</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="jitUpdateUsers"
                              checked={provisioningConfig.jitUpdateUsers}
                              onChange={(e) => handleProvisioningFieldChange('jitUpdateUsers', e.target.checked)}
                              className="rounded border-input"
                            />
                            <Label htmlFor="jitUpdateUsers" className="text-xs">Update existing users</Label>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="jitDefaultRole" className="text-sm font-medium">Default Role for New Users</Label>
                      <select
                        id="jitDefaultRole"
                        value={provisioningConfig.jitDefaultRole}
                        onChange={(e) => handleProvisioningFieldChange('jitDefaultRole', e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-input bg-background rounded"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Role assigned to users created through JIT provisioning
                      </p>
                    </div>
                  </div>
                </div>

                {/* SCIM Configuration Section */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-foreground border-b pb-1">
                    SCIM (System for Cross-domain Identity Management)
                  </h3>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="scimEnabled"
                      checked={provisioningConfig.scimEnabled}
                      onChange={(e) => handleProvisioningFieldChange('scimEnabled', e.target.checked)}
                      className="rounded border-input"
                    />
                    <Label htmlFor="scimEnabled" className="text-sm font-medium">Enable SCIM Provisioning</Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Allow your identity provider to create, update, and delete users automatically
                  </p>
                  
                  {provisioningConfig.scimEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                      <div className="space-y-2">
                        <Label htmlFor="scimEndpoint" className="text-xs font-medium">SCIM Endpoint URL</Label>
                        <div className="flex items-center space-x-1">
                          <Input
                            id="scimEndpoint"
                            value={`https://api.mymapit.in/scim/v2/${organizationName?.toLowerCase() || 'org'}`}
                            readOnly
                            className="flex-1 bg-muted text-xs h-8"
                          />
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => enhancedCopyToClipboard(`https://api.mymapit.in/scim/v2/${organizationName?.toLowerCase() || 'org'}`, 'SCIM Endpoint')}
                            title="Copy SCIM Endpoint"
                          >
                            {copySuccess === 'SCIM Endpoint' ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="scimToken" className="text-xs font-medium">SCIM Bearer Token</Label>
                        <div className="flex items-center space-x-1">
                          <Input
                            id="scimToken"
                            type="password"
                            value={provisioningConfig.scimToken}
                            placeholder="Click generate to create token"
                            readOnly
                            className="flex-1 text-xs h-8"
                          />
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={generateScimToken}
                          >
                            Generate
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Attribute Mapping Section */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-foreground border-b pb-1">
                    Attribute Mapping
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Map identity provider claims to application user attributes
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(provisioningConfig.attributeMapping).map(([attribute, claim]) => (
                      <div key={attribute} className="space-y-1">
                        <Label htmlFor={`mapping-${attribute}`} className="text-xs font-medium capitalize">
                          {attribute === 'displayName' ? 'Display Name' : attribute}
                        </Label>
                        <Input
                          id={`mapping-${attribute}`}
                          value={claim}
                          onChange={(e) => handleAttributeMappingChange(attribute, e.target.value)}
                          placeholder={`IdP claim for ${attribute}`}
                          className="text-xs h-8"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deprovisioning Rules Section */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-foreground border-b pb-1">
                    User Lifecycle & Deprovisioning
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="deprovisionOnSuspend"
                          checked={provisioningConfig.deprovisionOnSuspend}
                          onChange={(e) => handleProvisioningFieldChange('deprovisionOnSuspend', e.target.checked)}
                          className="rounded border-input"
                        />
                        <Label htmlFor="deprovisionOnSuspend" className="text-xs">Suspend on IdP deactivation</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="deprovisionOnDelete"
                          checked={provisioningConfig.deprovisionOnDelete}
                          onChange={(e) => handleProvisioningFieldChange('deprovisionOnDelete', e.target.checked)}
                          className="rounded border-input"
                        />
                        <Label htmlFor="deprovisionOnDelete" className="text-xs">Delete on IdP removal</Label>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="retentionDays" className="text-xs font-medium">Data Retention (days)</Label>
                      <Input
                        id="retentionDays"
                        type="number"
                        value={provisioningConfig.retentionDays}
                        onChange={(e) => handleProvisioningFieldChange('retentionDays', parseInt(e.target.value))}
                        min="1"
                        max="365"
                        className="text-xs h-8"
                      />
                      <p className="text-xs text-muted-foreground">
                        Days to retain user data after deletion
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Default Permissions</Label>
                      <div className="space-y-1">
                        {['read:profile', 'read:organization', 'write:profile', 'admin:users'].map(permission => (
                          <div key={permission} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`perm-${permission}`}
                              checked={provisioningConfig.defaultPermissions.includes(permission)}
                              onChange={(e) => {
                                const permissions = e.target.checked 
                                  ? [...provisioningConfig.defaultPermissions, permission]
                                  : provisioningConfig.defaultPermissions.filter(p => p !== permission)
                                handleProvisioningFieldChange('defaultPermissions', permissions)
                              }}
                              className="rounded border-input"
                            />
                            <Label htmlFor={`perm-${permission}`} className="text-xs">{permission}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-3 pt-4">
                {/* Provisioning test status */}
                {provisioningTest.status !== 'idle' && (
                  <div className={`w-full p-3 rounded text-xs ${
                    provisioningTest.status === 'testing' ? 'bg-muted text-muted-foreground' :
                    provisioningTest.status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                    'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {provisioningTest.status === 'testing' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : provisioningTest.status === 'success' ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      <span className="font-medium">{provisioningTest.message || 'Testing provisioning...'}</span>
                    </div>
                    
                    {provisioningTest.details && (
                      <div className="space-y-1 ml-5">
                        {provisioningTest.details.map((detail, index) => (
                          <div key={index} className="text-xs">
                            {detail}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex space-x-2 w-full">
                  <Button 
                    type="submit"
                    className="flex-1 h-9 bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
                  >
                    Complete Setup
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleTestProvisioning}
                    disabled={provisioningTest.status === 'testing'}
                    className="flex-1 h-9 text-sm"
                    title="Test provisioning configuration"
                  >
                    {provisioningTest.status === 'testing' ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Testing...
                      </>
                    ) : (
                      'Test Provisioning'
                    )}
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
        
        {/* Bottom navigation buttons */}
        <div className="fixed bottom-4 left-4 z-20">
          <Button variant="ghost" onClick={() => setStep('sso-config')} className="text-xs text-muted-foreground">
            ← Back to SSO Config
          </Button>
        </div>
        <div className="fixed bottom-4 right-4 z-20">
          <Button variant="ghost" onClick={() => setStep('dashboard')} className="text-xs text-muted-foreground">
            Skip to dashboard →
          </Button>
        </div>
      </InteractiveBackground>
    )
  }

  if (step === 'dashboard') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-white">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#581C60'}}>
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-xl font-semibold" style={{color: '#581C60'}}>Acme</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">{organizationName || 'Your Organization'}</span>
                <span className="text-sm font-medium">{fullName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center" style={{backgroundColor: '#efe8f0'}}>
                <CheckCircle className="h-10 w-10" style={{color: '#581C60'}} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Setup Complete!</h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Your organization is ready. You can now configure SSO and manage your team.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{backgroundColor: '#efe8f0'}}>
                    <Shield className="h-6 w-6" style={{color: '#581C60'}} />
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center space-x-2">
                      <span>Configure SSO</span>
                      {ssoProtocol && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                          <Check className="h-3 w-3 mr-1" />
                          {ssoProtocol.toUpperCase()} Configured
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {ssoProtocol 
                        ? `${ssoProtocol.toUpperCase()} SSO with user provisioning configured` 
                        : 'Set up SAML or OIDC for your organization'
                      }
                    </p>
                  </div>
                  <Button 
                    onClick={() => setStep(ssoProtocol ? 'sso-config' : 'sso-protocol-selection')}
                    variant={ssoProtocol ? "outline" : "default"}
                    className="w-full h-11" 
                    style={ssoProtocol ? {} : {backgroundColor: '#581C60', borderColor: '#581C60'}}
                  >
                    {ssoProtocol ? 'Manage SSO' : 'Setup SSO'}
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{backgroundColor: '#efe8f0'}}>
                    <Users className="h-6 w-6" style={{color: '#581C60'}} />
                  </div>
                  <div>
                    <h3 className="font-semibold">Manage Users</h3>
                    <p className="text-sm text-muted-foreground">Invite team members and set permissions</p>
                  </div>
                  <Button variant="outline" className="w-full h-11">
                    Add Users
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{backgroundColor: '#efe8f0'}}>
                    <Zap className="h-6 w-6" style={{color: '#581C60'}} />
                  </div>
                  <div>
                    <h3 className="font-semibold">Organization Settings</h3>
                    <p className="text-sm text-muted-foreground">Configure your organization preferences</p>
                  </div>
                  <Button variant="outline" className="w-full h-11">
                    Settings
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
        
        {/* Bottom navigation buttons */}
        <div className="fixed bottom-4 left-4">
          <Button variant="ghost" onClick={() => setStep('org-creation')} className="text-xs text-muted-foreground">
            ← Previous step
          </Button>
        </div>
        <div className="fixed bottom-4 right-4">
          <Button variant="ghost" onClick={() => setStep('signup')} className="text-xs text-muted-foreground">
            Restart flow →
          </Button>
        </div>
      </div>
    )
  }

  return (
    <InteractiveBackground>
      {/* Header */}
      <div className="border-b bg-white relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#581C60'}}>
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-xl font-semibold" style={{color: '#581C60'}}>Acme</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button className="font-medium hover:underline" style={{color: '#581C60'}}>
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen py-12 relative z-10">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-4 text-center">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
              <CardDescription className="text-base">
                Join thousands of users who trust our platform
              </CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">Full name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className="h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll detect if this is a corporate domain
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters with a mix of letters and numbers
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="space-y-4">
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium" 
                style={{backgroundColor: '#581C60', borderColor: '#581C60'}}
              >
                Create account
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
      <div className="fixed bottom-4 left-4 z-20">
        <Button variant="ghost" onClick={() => setStep('signup')} className="text-xs text-muted-foreground">
          ← Previous step
        </Button>
      </div>
      <div className="fixed bottom-4 right-4 z-20">
        <Button variant="ghost" onClick={() => setStep('email-sent')} className="text-xs text-muted-foreground">
          Skip to next step →
        </Button>
      </div>
    </InteractiveBackground>
  )
}

export default App

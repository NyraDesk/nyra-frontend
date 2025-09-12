/**
 * Sanitizes and normalizes user input to create valid URLs
 * @param input - The user input string
 * @returns A valid URL string or null if invalid
 */
export function sanitizeUrlInput(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Trim whitespace and convert to lowercase
  const cleanedInput = input.trim().toLowerCase();

  // If input is empty after trimming, return null
  if (cleanedInput === '') {
    return null;
  }

  // If input contains invalid characters for URLs, return null
  const invalidChars = [' ', '?', '#', '&', '\\', '<', '>', '"', "'"];
  if (invalidChars.some(char => cleanedInput.includes(char))) {
    return null;
  }

  // If already a valid URL with protocol, return unchanged
  if (cleanedInput.startsWith('http://') || cleanedInput.startsWith('https://')) {
    return cleanedInput;
  }

  // Common TLDs to check
  const commonTlds = ['.com', '.it', '.org', '.net', '.edu', '.gov', '.io', '.co', '.uk', '.de', '.fr', '.es', '.nl', '.se', '.no', '.dk', '.fi', '.pl', '.cz', '.hu', '.ro', '.bg', '.hr', '.si', '.sk', '.ee', '.lv', '.lt', '.pt', '.gr', '.cy', '.mt', '.lu', '.be', '.ie', '.at', '.ch', '.li', '.mc', '.ad', '.sm', '.va', '.mt', '.al', '.ba', '.me', '.mk', '.rs', '.tr', '.ua', '.by', '.md', '.ge', '.am', '.az', '.kz', '.kg', '.tj', '.tm', '.uz', '.ru', '.su', '.рф'];

  // Check if input already has a TLD
  const hasTld = commonTlds.some(tld => cleanedInput.endsWith(tld));

  // If input has www. prefix
  if (cleanedInput.startsWith('www.')) {
    return `https://${cleanedInput}`;
  }

  // If input has a TLD but no www.
  if (hasTld && !cleanedInput.startsWith('www.')) {
    return `https://${cleanedInput}`;
  }

  // If input has a TLD with www.
  if (hasTld && cleanedInput.startsWith('www.')) {
    return `https://${cleanedInput}`;
  }

  // If input is a single word (no dots), assume it's a domain name
  if (!cleanedInput.includes('.') && !cleanedInput.includes(' ')) {
    // Common exceptions that don't need www.
    const noWwwDomains = ['localhost', '127.0.0.1', '0.0.0.0'];
    if (noWwwDomains.includes(cleanedInput)) {
      return `https://${cleanedInput}`;
    }
    
    // For regular domain names, add www. and .com
    return `https://www.${cleanedInput}.com`;
  }



  // If we get here, the input might be a valid domain without TLD
  // Try adding .com as default
  if (!cleanedInput.includes('.')) {
    return `https://www.${cleanedInput}.com`;
  }

  // If it has dots but doesn't match our patterns, it might still be valid
  // Add https:// if no protocol is present
  if (!cleanedInput.startsWith('http://') && !cleanedInput.startsWith('https://')) {
    return `https://${cleanedInput}`;
  }

  // If we can't determine a valid URL pattern, return null
  return null;
}

/**
 * Validates if a string is a valid URL
 * @param url - The URL string to validate
 * @returns True if the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes URL input and validates the result
 * @param input - The user input string
 * @returns A valid URL string or null if invalid
 */
export function sanitizeAndValidateUrl(input: string): string | null {
  const sanitized = sanitizeUrlInput(input);
  
  if (sanitized && isValidUrl(sanitized)) {
    return sanitized;
  }
  
  return null;
} 
/**
 * Generate user initials from a full name
 * @param {string} name - The user's full name
 * @returns {string} - The user's initials (up to 2 characters)
 */
export const getUserInitials = name => {
  if (!name) return 'U'

  const words = name
    .trim()
    .split(' ')
    .filter(word => word.length > 0)

  if (words.length === 0) return 'U'
  if (words.length === 1) return words[0].charAt(0).toUpperCase()

  // Get first letter of first word and first letter of last word
  const firstInitial = words[0].charAt(0).toUpperCase()
  const lastInitial = words[words.length - 1].charAt(0).toUpperCase()

  return firstInitial + lastInitial
}

/**
 * Generate a consistent color for a user based on their name
 * @param {string} name - The user's name
 * @param {boolean} isDarkMode - Whether dark mode is active
 * @returns {string} - A hex color string
 */
export const getUserAvatarColor = (name, isDarkMode = false) => {
  if (!name) return isDarkMode ? '#4caf50' : '#2e7d32'

  // Generate a hash from the name
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  // Convert to a color
  const colors = isDarkMode
    ? [
        '#f44336',
        '#e91e63',
        '#9c27b0',
        '#673ab7',
        '#3f51b5',
        '#2196f3',
        '#03a9f4',
        '#00bcd4',
        '#009688',
        '#4caf50',
        '#8bc34a',
        '#cddc39',
        '#ffeb3b',
        '#ffc107',
        '#ff9800',
        '#ff5722',
      ]
    : [
        '#d32f2f',
        '#c2185b',
        '#7b1fa2',
        '#512da8',
        '#303f9f',
        '#1976d2',
        '#0288d1',
        '#0097a7',
        '#00796b',
        '#388e3c',
        '#689f38',
        '#afb42b',
        '#fbc02d',
        '#ffa000',
        '#f57c00',
        '#e64a19',
      ]

  return colors[Math.abs(hash) % colors.length]
}

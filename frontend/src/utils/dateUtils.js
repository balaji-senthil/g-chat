/**
 * Format a timestamp to show both date and time
 * @param {Date|string|number} timestamp - The timestamp to format
 * @returns {object} - Object containing formatted date and time strings
 */
export const formatMessageTimestamp = timestamp => {
  // Validate the timestamp before formatting
  let dateObject = timestamp instanceof Date ? timestamp : new Date(timestamp)

  // Check if the dateObject is valid
  if (!dateObject || isNaN(dateObject.getTime())) {
    return {
      date: '--/--/----',
      time: '--:--',
      isToday: false,
      isYesterday: false,
    }
  }

  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const messageDate = new Date(
      dateObject.getFullYear(),
      dateObject.getMonth(),
      dateObject.getDate(),
    )

    const isToday = messageDate.getTime() === today.getTime()
    const isYesterday = messageDate.getTime() === yesterday.getTime()

    // Format time
    const time = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(dateObject)

    // Format date based on when it was sent
    let date
    if (isToday) {
      date = 'Today'
    } else if (isYesterday) {
      date = 'Yesterday'
    } else {
      // Check if it's within the current year
      const isCurrentYear = dateObject.getFullYear() === now.getFullYear()

      if (isCurrentYear) {
        // Show month and day for current year
        date = new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
        }).format(dateObject)
      } else {
        // Show month, day, and year for previous years
        date = new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(dateObject)
      }
    }

    return {
      date,
      time,
      isToday,
      isYesterday,
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error, 'Timestamp:', timestamp)
    return {
      date: '--/--/----',
      time: '--:--',
      isToday: false,
      isYesterday: false,
    }
  }
}

/**
 * Format a date for display in a compact format
 * @param {Date|string|number} timestamp - The timestamp to format
 * @returns {string} - Formatted date and time string
 */
export const formatCompactDateTime = timestamp => {
  const {date, time} = formatMessageTimestamp(timestamp)
  return `${date}, ${time}`
}

/**
 * WhatsApp-style date header formatting
 * @param {Date|string|number} timestamp - The timestamp to format
 * @returns {string} - Formatted date for group headers
 */
export const formatDateHeader = timestamp => {
  const dateObject = timestamp instanceof Date ? timestamp : new Date(timestamp)

  if (!dateObject || isNaN(dateObject.getTime())) {
    return 'Invalid Date'
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const messageDate = new Date(
    dateObject.getFullYear(),
    dateObject.getMonth(),
    dateObject.getDate(),
  )

  const isToday = messageDate.getTime() === today.getTime()
  const isYesterday = messageDate.getTime() === yesterday.getTime()

  if (isToday) {
    return 'Today'
  } else if (isYesterday) {
    return 'Yesterday'
  } else {
    // Check if it's within the current year
    const isCurrentYear = dateObject.getFullYear() === now.getFullYear()

    if (isCurrentYear) {
      // Show full date for current year: "December 15"
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
      }).format(dateObject)
    } else {
      // Show full date with year: "December 15, 2023"
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(dateObject)
    }
  }
}

/**
 * WhatsApp-style compact time formatting (just time, no date)
 * @param {Date|string|number} timestamp - The timestamp to format
 * @returns {string} - Formatted time string
 */
export const formatMessageTime = timestamp => {
  const dateObject = timestamp instanceof Date ? timestamp : new Date(timestamp)

  if (!dateObject || isNaN(dateObject.getTime())) {
    return '--:--'
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(dateObject)
}

/**
 * WhatsApp-style thread timestamp formatting for sidebar threads
 * Shows relative time like "5 min ago", "Yesterday", "2 days ago", etc.
 * @param {Date|string|number} timestamp - The timestamp to format
 * @returns {string} - Formatted relative time string
 */
export const formatThreadTimestamp = timestamp => {
  const dateObject = timestamp instanceof Date ? timestamp : new Date(timestamp)

  if (!dateObject || isNaN(dateObject.getTime())) {
    return ''
  }

  const now = new Date()
  const diffInMs = now.getTime() - dateObject.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  // Less than 1 minute ago
  if (diffInMinutes < 1) {
    return 'now'
  }

  // Less than 1 hour ago
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`
  }

  // Less than 24 hours ago
  if (diffInHours < 24) {
    return `${diffInHours}h`
  }

  // Yesterday
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (diffInDays === 1) {
    return 'Yesterday'
  }

  // Less than 7 days ago
  if (diffInDays < 7) {
    return `${diffInDays}d`
  }

  // This week (show day name)
  if (diffInDays < 7) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
    }).format(dateObject)
  }

  // This year (show month and day)
  if (dateObject.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(dateObject)
  }

  // Previous years (show month, day, and year)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  }).format(dateObject)
}

/**
 * Get date key for grouping messages (YYYY-MM-DD format in local timezone)
 * @param {Date|string|number} timestamp - The timestamp
 * @returns {string} - Date key for grouping
 */
export const getDateKey = timestamp => {
  const dateObject = timestamp instanceof Date ? timestamp : new Date(timestamp)

  if (!dateObject || isNaN(dateObject.getTime())) {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(now.getDate()).padStart(2, '0')}`
  }

  // Use local timezone instead of UTC to match formatDateHeader logic
  const year = dateObject.getFullYear()
  const month = String(dateObject.getMonth() + 1).padStart(2, '0')
  const day = String(dateObject.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

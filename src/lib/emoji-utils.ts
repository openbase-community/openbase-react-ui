// Helper function to extract emoji from docstring
export const getEmojiFromDocstring = (docstring: string) => {
  if (!docstring) return null;

  // Get the first character (handling surrogate pairs)
  const firstCodeUnit = docstring.charCodeAt(0);
  let firstChar = docstring.charAt(0);
  let emojiLength = 1;

  // Check if it's a high surrogate (part of a surrogate pair)
  if (
    firstCodeUnit >= 0xd800 &&
    firstCodeUnit <= 0xdbff &&
    docstring.length > 1
  ) {
    const secondCodeUnit = docstring.charCodeAt(1);
    if (secondCodeUnit >= 0xdc00 && secondCodeUnit <= 0xdfff) {
      // This is a complete surrogate pair
      firstChar = docstring.substring(0, 2);
      emojiLength = 2;
    }
  }

  // Updated emoji regex to include more ranges including document emojis
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F004}]|[\u{1F0CF}]/u;

  const isEmoji = emojiRegex.test(firstChar);

  return isEmoji ? { emoji: firstChar, length: emojiLength } : null;
};

// Helper function to get docstring without emoji if emoji is used as icon
export const getDisplayDocstring = (docstring: string) => {
  if (!docstring) return docstring;

  // Check for actual emoji character
  const emojiResult = getEmojiFromDocstring(docstring);
  if (emojiResult) {
    // Remove the emoji (accounting for surrogate pairs) and any trailing space from the docstring
    return docstring.slice(emojiResult.length).trim();
  }

  return docstring;
};

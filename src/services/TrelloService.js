/**
 * TimeUp - Trello Service
 * Wrapper for Trello Power-Up API calls
 */

/**
 * Gets the current card info.
 * @param {Object} t - Trello client
 * @returns {Promise<Object|null>} Card data or null
 */
export const getCard = async (t) => {
  try {
    return await t.card("id", "name", "url");
  } catch (error) {
    console.error("[TrelloService] getCard error:", error);
    return null;
  }
};

/**
 * Gets the current board info.
 * @param {Object} t - Trello client
 * @returns {Promise<Object|null>} Board data or null
 */
export const getBoard = async (t) => {
  try {
    return await t.board("id", "name", "url");
  } catch (error) {
    console.error("[TrelloService] getBoard error:", error);
    return null;
  }
};

/**
 * Gets the current member info.
 * @param {Object} t - Trello client
 * @returns {Promise<Object|null>} Member data or null
 */
export const getMember = async (t) => {
  try {
    return await t.member("id", "fullName", "username");
  } catch (error) {
    console.error("[TrelloService] getMember error:", error);
    return null;
  }
};

/**
 * Closes the current popup.
 * @param {Object} t - Trello client
 * @returns {Promise<void>}
 */
export const closePopup = async (t) => {
  try {
    await t.closePopup();
  } catch (error) {
    console.error("[TrelloService] closePopup error:", error);
  }
};

const TrelloService = { getCard, getBoard, getMember, closePopup };
export default TrelloService;

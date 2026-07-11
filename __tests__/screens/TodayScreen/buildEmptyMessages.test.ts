/**
 * KAN-245 — buildEmptyMessages: the empty-state rotation's "Going somewhere
 * soon?" slot is the only tappable message, wired by the caller.
 */

import { buildEmptyMessages } from '../../../src/screens/TodayScreen/constants';
import { COPY } from '../../../src/constants/copy';

describe('buildEmptyMessages', () => {
  it('returns one NudgeMessage per COPY.today.emptyMessages entry', () => {
    const messages = buildEmptyMessages();
    expect(messages).toHaveLength(COPY.today.emptyMessages.length);
    expect(messages.map(m => m.text)).toEqual(COPY.today.emptyMessages);
  });

  it('only the last message ("Going somewhere soon?") gets the onPress callback', () => {
    const onPress = jest.fn();
    const messages = buildEmptyMessages(onPress);

    messages.slice(0, -1).forEach(m => expect(m.onPress).toBeUndefined());
    expect(messages[messages.length - 1].onPress).toBe(onPress);
  });

  it('the last message has no onPress when no callback is given (stays non-interactive)', () => {
    const messages = buildEmptyMessages();
    expect(messages[messages.length - 1].onPress).toBeUndefined();
  });
});

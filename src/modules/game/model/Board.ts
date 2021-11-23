import { ATTACK_WORD_AVAILABLE } from '@game/constants';
import { Word } from './Word';

class Board {
  words: Word[];
  private currentY = 0;
  attackWordsQueue: Word[];

  constructor() {
    this.words = [];
    this.attackWordsQueue = [];
  }

  public addWord(word: Word): void {
    this.words.push(word);
  }

  public removeWord(id: string): Word {
    const index = this.words.findIndex((w) => w.id === id);
    if (index < 0) {
      throw new Error('unable to find word to delete');
    }
    const word = this.words.splice(index, 1);
    return word[0];
  }

  public popAttackWord(id: string): Word {
    for (let i = 0; i < ATTACK_WORD_AVAILABLE; i++) {
      const word = this.attackWordsQueue[i];
      if (word.id === id) {
        this.attackWordsQueue = this.attackWordsQueue.splice(i, 1);
        return word;
      }
    }
    const existing = this.attackWordsQueue.find((w) => w.id === id);
    if (existing) {
      throw new Error('word not available to be poped');
    }
    throw new Error('unable to find word');
  }

  public populateAttackWords(words: Word[]): void {
    this.attackWordsQueue = [...this.attackWordsQueue, ...words];
  }
}

export { Board };

import { WORD_DURATION } from '@game/constants';
import { io } from '@game/infra/io';
import { MyNamespace, MySocket } from '@game/infra/types';
import { Match } from '@game/model/Match';
import { Player } from '@game/model/Player';
import { Word } from '@game/model/Word';
import { generateWord } from '@game/services/generateWord';
import { Socket } from 'socket.io';
import { lerp } from 'src/utils/lerp';
import { MatchUtils } from './utils';

interface IMatchManagerConstructorDTO {
  match: Match;
}

class MatchManager {
  public match: Match;
  private nsp: MyNamespace;

  private handleWordFinished(socket: Socket, wordId: string) {
    const player = MatchUtils.getPlayerFromSocket({
      match: this.match,
      socket: socket,
    });
    if (player) {
      player.board.removeWord(wordId);
    }
  }

  private damagePlayer(player: Player, dmg: number) {
    if (player.hp <= dmg) {
      player.hp = 0;
    } else {
      player.hp -= dmg;
    }
    const players = Object.values(this.match.players);
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.socket) {
        if (p.id === player.id) {
          p.socket.emit('update_player', player);
        } else {
          p.socket.emit('other_player_update', {
            hp: player.hp,
            id: player.id,
          });
        }
      }
    }
  }

  private moveWord(word: Word) {
    const now = new Date();
    const expire = new Date(word.createdAt.getTime() + WORD_DURATION);
    if (expire.getTime() <= now.getTime()) {
      this.damagePlayer(this.match.players[word.targetId], word.word.length);
    } else {
      const position = lerp(
        0,
        WORD_DURATION,
        (now.getTime() - word.createdAt.getTime()) / WORD_DURATION,
      );
      word.position = position;
    }
  }

  private async spawnCycle() {
    if (this.match.onGoing) {
      const players = Object.values(this.match.players);
      for (let i = 0; i < players.length; i++) {
        const word = generateWord(players[i].id);
        players[i].board.addWord(word);
      }
      setTimeout(this.spawnCycle, 5000);
    }
  }

  private async tick() {
    if (this.match.onGoing) {
      const players = Object.values(this.match.players);
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        for (let j = 0; j < player.board.words.length; i++) {
          this.moveWord(player.board.words[j]);
        }
        if (player.socket) {
          player.socket.emit('update_player', player);
        }
      }
      setTimeout(this.tick, 100);
    }
  }

  private async startMatch(): Promise<void> {
    this.match.onGoing = true;
    this.nsp.emit('start_match', this.match);
    setTimeout(() => {
      this.spawnCycle();
      this.tick();
    }, 5000);
  }

  private handleStartEvent(socket: MySocket): void {
    const player = MatchUtils.getPlayerFromSocket({
      match: this.match,
      socket: socket,
    });
    if (player && player.id === this.match.hostId) {
      const players = Object.values(this.match.players);
      for (let i = 0; i < players.length; i++) {
        if (!players[i].socket) {
          socket.emit('message', {
            isError: true,
            text: 'some players have not connected yet.',
          });
          return;
        }
      }
      this.startMatch();
    }
  }

  private connectPlayer(socket: MySocket): void {
    const player = MatchUtils.getPlayerFromSocket({
      match: this.match,
      socket: socket,
    });
    if (player) {
      player.socket = socket;
      // While there isn't a ready and start match option:
      if (player.id !== this.match.hostId) {
        this.startMatch();
      }
      socket.on('start_match', () => this.handleStartEvent(socket));
      socket.on('word_finished', (wordId) =>
        this.handleWordFinished(socket, wordId),
      );
    }
  }

  private listenToConnection() {
    this.nsp.on('connection', (socket) => {
      this.connectPlayer(socket);
    });
  }

  constructor({ match }: IMatchManagerConstructorDTO) {
    this.match = match;
    this.nsp = io.of(`/match/${match.id}`);
    this.listenToConnection();
  }

  public addPlayer(player: Player): void {
    this.match.players[player.id] = player;
  }
}

export { MatchManager };

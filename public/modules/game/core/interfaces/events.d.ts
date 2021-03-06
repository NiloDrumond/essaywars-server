import { Player } from '@game/model/Player';
export interface MessageEventData {
    isError: boolean;
    text: string;
}
export declare type IPlayerDTO = Pick<Player, 'board' | 'id' | 'created_at' | 'hp' | 'user'>;
export interface IMatchDTO {
    id: string;
    code: string;
    onGoing: boolean;
    players: Record<string, IPlayerDTO>;
}
export interface ServerToClientEvents {
    message: (data: MessageEventData) => void;
    update_player: (data: IPlayerDTO) => void;
    other_player_update: (data: Pick<Player, 'hp' | 'id'>) => void;
    start_match: (match: IMatchDTO) => void;
}
export interface ClientToServerEvents extends ServerToClientEvents {
    start_match: () => void;
    word_finished: (wordId: string) => void;
}

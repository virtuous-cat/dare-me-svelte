<script lang="ts">
  import { customAlphabet } from "nanoid";
  import { goto } from "$app/navigation";
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nanoid = customAlphabet(alphabet, 4);
  let gameCode: string;
</script>

<h1>Dare Me</h1>
<button
  on:click={() => {
    const newCode = nanoid();
    goto(`/games/${newCode}`);
  }}>Start a New Game</button
>
<p>or</p>
<label>
  Game Code: <input type="text" bind:value={gameCode} />
</label>
<!-- TODO: add validation -->
<button
  on:click={() => {
    goto(`/games/${gameCode.toUpperCase}`);
  }}>Join Game</button
>

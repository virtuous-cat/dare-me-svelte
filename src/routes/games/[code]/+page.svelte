<script lang="ts">
  import { io } from "socket.io-client";

  const socket = io();

  let chatlog: string[] = [];

  socket.on("serverChat", (message) => {
    chatlog = [...chatlog, message];
  });
</script>

<a href="/">Leave Game</a>

<div class="chat">
  <ul class="chatlog">
    {#each chatlog as chat}
      <li>{chat}</li>
    {/each}
  </ul>
  <input type="text" name="chat" /><button>Send</button>
</div>

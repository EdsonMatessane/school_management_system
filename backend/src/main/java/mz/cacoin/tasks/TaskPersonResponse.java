package mz.cacoin.tasks;

/** Pessoa escolhível numa tarefa: o ID é o que fica guardado; o nome é só para mostrar. */
public record TaskPersonResponse(Long id, String name, String staffType) {}

package mz.cacoin.modules.disciplines;

public interface DisciplineSummaryProjection {
  Long getId();

  Long getCourseId();

  String getCourseName();

  Integer getDisciplineNumber();

  String getName();

  boolean getActive();
}

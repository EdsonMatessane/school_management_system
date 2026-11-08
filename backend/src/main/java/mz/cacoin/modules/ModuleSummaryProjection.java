package mz.cacoin.modules;

public interface ModuleSummaryProjection {
  Long getId();

  Long getCourseId();

  String getCourseName();

  Integer getModuleNumber();

  String getName();

  boolean getActive();
}

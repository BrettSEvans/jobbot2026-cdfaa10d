import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";
import { useApplicationDetail } from "@/hooks/useApplicationDetail";
import { useCoverLetterEditor } from "@/hooks/useCoverLetterEditor";
import { useDashboardEditor } from "@/hooks/useDashboardEditor";
import { useResumeEditor } from "@/hooks/useResumeEditor";
import { ResumeTab } from "@/components/tabs/ResumeTab";
import { CoverLetterTab } from "@/components/tabs/CoverLetterTab";
import { JDAnalysisTab } from "@/components/tabs/JDAnalysisTab";
import { DetailsTab } from "@/components/tabs/DetailsTab";
import DynamicMaterialsSection from "@/components/DynamicMaterialsSection";

const ApplicationDetail = () => {
  const detail = useApplicationDetail();
  const {
    id, navigate, toast, app, setApp, loading, saving, isValidUuid,
    coverLetter, setCoverLetter, editingCoverLetter, setEditingCoverLetter,
    jobDescription, setJobDescription, editingJobDescription, setEditingJobDescription,
    companyUrl, setCompanyUrl, companyName, setCompanyName, jobTitle, setJobTitle,
    editingMeta, setEditingMeta,
    dashboardHtml, setDashboardHtml, dashboardData, setDashboardData,
    chatHistory, setChatHistory,
    revisionTrigger, setRevisionTrigger,
    coverLetterRevisionTrigger, setCoverLetterRevisionTrigger,
    resumeRevisionTrigger, setResumeRevisionTrigger,
    previewHtml, setPreviewHtml, previewCoverLetter, setPreviewCoverLetter,
    previewResumeHtml, setPreviewResumeHtml,
    bgJob, isBgGenerating, prevId, nextId,
    resumeText, userProfile, userResumes,
    saveField, handleCopy, handleAcceptFabrication, handleRevertFabrication,
  } = detail;

  const clEditor = useCoverLetterEditor({
    id, coverLetter, setCoverLetter,
    coverLetterRevisionTrigger, setCoverLetterRevisionTrigger,
    userProfile, jobDescription, saveField, toast,
  });

  const dashEditor = useDashboardEditor({
    id, app, jobDescription, companyName, jobTitle,
    dashboardHtml, setDashboardHtml, dashboardData, setDashboardData,
    chatHistory, setChatHistory, revisionTrigger, setRevisionTrigger,
    saveField, toast,
  });

  const resumeEditor = useResumeEditor({
    id, app, setApp, jobDescription, companyName, jobTitle,
    userResumes, resumeRevisionTrigger, setResumeRevisionTrigger, toast,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!app || !isValidUuid) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Application not found.</p>
        <Button variant="outline" onClick={() => navigate("/applications")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/applications")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {companyName || "Unknown Company"} — {jobTitle || "Unknown Role"}
              </h1>
              <p className="text-xs text-muted-foreground">{app.job_url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2" data-tour="prev-next">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={!prevId}
              onClick={() => prevId && navigate(`/applications/${prevId}`)} title="Previous application">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={!nextId}
              onClick={() => nextId && navigate(`/applications/${nextId}`)} title="Next application">
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Badge variant={app.status === "complete" ? "default" : "secondary"}>{app.status}</Badge>
          </div>
        </div>

        <Tabs defaultValue="resume" className="space-y-4">
          <TabsList className="w-full justify-start flex-wrap">
            <TabsTrigger value="resume">Resume</TabsTrigger>
            <TabsTrigger value="cover-letter" className="flex items-center gap-1.5">
              Cover Letter
              {app?.generation_status && !["idle", "complete", "error"].includes(app.generation_status) && !app?.cover_letter && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </TabsTrigger>
            <TabsTrigger value="jd-analysis">JD Analysis</TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-1.5">
              Materials
              {app?.generation_status && !["idle", "complete", "error"].includes(app.generation_status) && !app?.dashboard_html && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="resume" className="space-y-4">
            <ResumeTab
              id={id!} app={app} userProfile={userProfile} setApp={setApp}
              jobDescription={jobDescription} companyName={companyName} jobTitle={jobTitle}
              resumeText={resumeText} userResumes={userResumes}
              isBgGenerating={isBgGenerating} bgJob={bgJob}
              previewResumeHtml={previewResumeHtml} setPreviewResumeHtml={setPreviewResumeHtml}
              resumeRevisionTrigger={resumeRevisionTrigger} setResumeRevisionTrigger={setResumeRevisionTrigger}
              {...resumeEditor}
              saveField={saveField}
              handleAcceptFabrication={handleAcceptFabrication}
              handleRevertFabrication={handleRevertFabrication}
              toast={toast}
            />
          </TabsContent>

          <TabsContent value="cover-letter">
            <CoverLetterTab
              id={id!} app={app}
              coverLetter={coverLetter} setCoverLetter={setCoverLetter}
              editingCoverLetter={editingCoverLetter} setEditingCoverLetter={setEditingCoverLetter}
              saving={saving} companyName={companyName} jobTitle={jobTitle}
              userProfile={userProfile}
              previewCoverLetter={previewCoverLetter} setPreviewCoverLetter={setPreviewCoverLetter}
              coverLetterRevisionTrigger={coverLetterRevisionTrigger}
              {...clEditor}
              saveField={saveField} handleCopy={handleCopy} toast={toast}
            />
          </TabsContent>

          <TabsContent value="jd-analysis" className="space-y-4">
            <JDAnalysisTab
              id={id!} app={app} setApp={setApp}
              jobDescription={jobDescription} setJobDescription={setJobDescription}
              editingJobDescription={editingJobDescription} setEditingJobDescription={setEditingJobDescription}
               companyUrl={companyUrl} setCompanyUrl={setCompanyUrl}
               companyName={companyName} jobTitle={jobTitle}
               resumeText={resumeText} saving={saving}
               saveField={saveField} handleCopy={handleCopy} toast={toast}
               jobUrl={jobUrl} setJobUrl={setJobUrl}
            />
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <DynamicMaterialsSection
              applicationId={id!} app={app}
              jobDescription={jobDescription} companyName={companyName} jobTitle={jobTitle}
              isBgGenerating={isBgGenerating} bgJob={bgJob}
              dashboardHtml={dashboardHtml} dashboardData={dashboardData}
              setDashboardHtml={setDashboardHtml} setDashboardData={setDashboardData}
              chatOpen={dashEditor.chatOpen} setChatOpen={dashEditor.setChatOpen}
              chatInput={dashEditor.chatInput} setChatInput={dashEditor.setChatInput}
              chatHistory={chatHistory} setChatHistory={setChatHistory}
              isRefining={dashEditor.isRefining} setIsRefining={dashEditor.setIsRefining}
              isRegenerating={dashEditor.isRegenerating} setIsRegenerating={dashEditor.setIsRegenerating}
              previewHtml={previewHtml} setPreviewHtml={setPreviewHtml}
              revisionTrigger={revisionTrigger} setRevisionTrigger={setRevisionTrigger}
              iframeRef={dashEditor.iframeRef}
              handleRegenerateDashboard={dashEditor.handleRegenerateDashboard}
              handleSendChat={dashEditor.handleSendChat}
              handleDownloadZip={dashEditor.handleDownloadZip}
              saveField={saveField} toast={toast}
            />
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <DetailsTab
              app={app}
              companyName={companyName} setCompanyName={setCompanyName}
              jobTitle={jobTitle} setJobTitle={setJobTitle}
              companyUrl={companyUrl} setCompanyUrl={setCompanyUrl}
              jobDescription={jobDescription} setJobDescription={setJobDescription}
              editingMeta={editingMeta} setEditingMeta={setEditingMeta}
              saving={saving} saveField={saveField}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ApplicationDetail;
